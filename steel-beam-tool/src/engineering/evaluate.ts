import type { DesignInputs, CapacityResults, DiagramSet, DesignIntermediates } from '@/types';
import { COMBOS, analyseBeam } from '@/engineering/as1170/loadCombinations';
import { calcFy } from '@/engineering/sections/sectionUtils';
import {
  calcSectionCapacity,
  calcMemberCapacity,
} from '@/engineering/as4100/momentCapacity';
import { calcShearCapacity } from '@/engineering/as4100/shearCapacity';
import { calcCompressionCapacity } from '@/engineering/as4100/compressionCapacity';
import { calcDeflection, calcDeflectionProfile } from '@/engineering/as4100/deflection';
import { buildLtbSegments } from '@/engineering/as4100/effectiveLength';
import { getPsiL, LIVE_LOAD_LABELS } from '@/engineering/as1170/psiFactors';

export interface EvaluationResult {
  results: CapacityResults;
  diagrams: DiagramSet;
}

export function evaluateDesign(inputs: DesignInputs): EvaluationResult {
  const factored = analyseBeam(inputs, COMBOS[0]); // 1.2G+1.5Q
  const servic = analyseBeam(inputs, COMBOS[1]); // G+Q
  const dead = analyseBeam(inputs, COMBOS[2]); // G

  const fy = calcFy(inputs.section, inputs.steelGrade);

  const secCap = calcSectionCapacity(inputs.section, fy);

  // Rev 6 (Item 1): per-compression-flange governing-segment LTB. Compute φMbx
  // for every restrained compression-flange segment using its own Le and αm, and
  // take the segment with the lowest φMbx (highest utilisation) — not merely the
  // longest. The global αm override, if set, replaces the governing segment's αm.
  const { segments, bottomFlangeNoEffect } = buildLtbSegments(
    inputs.span,
    inputs.restraint,
    factored.bmd,
  );
  let gov = {
    Le: 0,
    alphaM: 1.0,
    alphaS: 1.0,
    Moa: Infinity,
    phiMbx: Infinity,
    start: 0,
    end: inputs.span,
    flange: 'top' as 'top' | 'bottom',
  };
  for (const seg of segments) {
    const segAlphaM = inputs.restraint.alphaMOverride ?? seg.alphaM;
    const cap = calcMemberCapacity(inputs.section, fy, seg.Le * 1000, segAlphaM);
    if (cap.phiMbx < gov.phiMbx) {
      gov = {
        Le: seg.Le,
        alphaM: segAlphaM,
        alphaS: cap.alphaS,
        Moa: cap.Moa,
        phiMbx: cap.phiMbx,
        start: seg.start,
        end: seg.end,
        flange: seg.flange,
      };
    }
  }
  const Le_m = gov.Le;
  const alphaM = gov.alphaM;
  const memCap = { Moa: gov.Moa, alphaS: gov.alphaS, phiMbx: gov.phiMbx };
  const shear = calcShearCapacity(inputs.section, fy);

  const psiL = getPsiL(inputs.liveLoadType);
  const deflGpsiLQ = calcDeflection(inputs, 'G+ψ_l·Q', psiL).max;
  const deflG = calcDeflection(inputs, 'G').max;
  const deflLimitGpsiLQ = (inputs.span * 1000) / inputs.deflLimits.GQ;
  const deflLimitG = (inputs.span * 1000) / inputs.deflLimits.G;

  // Axial compression + combined actions (AS4100 Cl. 8.4)
  let nStar = 0;
  let compCap = { phiNs: 0, phiNc: 0, kf: 1.0, lambdaN: 0, alphaC: 1.0 };
  if (inputs.axialCompression) {
    const { magnitude, category } = inputs.axialCompression;
    const n12G15Q = category === 'G' ? 1.2 * magnitude : 1.5 * magnitude;
    const nGQ = magnitude;
    const nG = category === 'G' ? magnitude : 0;
    nStar = Math.max(n12G15Q, nGQ, nG);
    compCap = calcCompressionCapacity(inputs.section, fy, Le_m * 1000, secCap.sectionClass);
  }
  // Ratios use consistent units: N* and φNs/φNc in kN; M* and φMs/φMbx in kN·m.
  const combinedSectionRatio =
    compCap.phiNs > 0 ? nStar / compCap.phiNs + factored.Mmax / secCap.phiMs : 0;
  const combinedMemberRatio =
    compCap.phiNc > 0 ? nStar / compCap.phiNc + factored.Mmax / memCap.phiMbx : 0;

  const sectionMoment = factored.Mmax <= secCap.phiMs;
  const memberMoment = factored.Mmax <= memCap.phiMbx;
  const shearPass = factored.Vmax <= shear.phiVv;
  const deflectionGpsiLQ = deflGpsiLQ <= deflLimitGpsiLQ;
  const deflectionG = deflG <= deflLimitG;
  const combinedSection = inputs.axialCompression ? combinedSectionRatio <= 1.0 : true;
  const combinedMember = inputs.axialCompression ? combinedMemberRatio <= 1.0 : true;
  const overall =
    sectionMoment &&
    memberMoment &&
    shearPass &&
    deflectionGpsiLQ &&
    deflectionG &&
    combinedSection &&
    combinedMember;

  const intermediates: DesignIntermediates = {
    fy,
    flangeLambda: secCap.flangeLambda,
    flangeEp: secCap.flangeEp,
    flangeEy: secCap.flangeEy,
    webLambda: secCap.webLambda,
    webEp: secCap.webEp,
    webEy: secCap.webEy,
    sectionClass: secCap.sectionClass,
    Ze: secCap.Ze,
    Msx: secCap.Msx,
    phiMs: secCap.phiMs,
    Le: Le_m,
    Moa: memCap.Moa,
    alphaM,
    alphaS: memCap.alphaS,
    phiMbx: memCap.phiMbx,
    govSegStart: gov.start,
    govSegEnd: gov.end,
    govFlange: gov.flange,
    bottomFlangeNoEffect,
    Aw: shear.Aw,
    dOnTw: shear.dOnTw,
    slenderLimit: shear.slenderLimit,
    webSlender: shear.webSlender,
    Vv: shear.Vv,
    phiVv: shear.phiVv,
    Mmax: factored.Mmax,
    Vmax: factored.Vmax,
    governingCombo: '1.2G+1.5Q',
    psiL,
    liveLoadTypeLabel: LIVE_LOAD_LABELS[inputs.liveLoadType],
    deflectionGpsiLQ: deflGpsiLQ,
    deflectionG: deflG,
    deflectionLimitGpsiLQ: deflLimitGpsiLQ,
    deflectionLimitG: deflLimitG,
    supportCondition: inputs.supportCondition,
    femA: factored.femA,
    femB: factored.femB,
    nStar,
    phiNs: compCap.phiNs,
    phiNc: compCap.phiNc,
    kf: compCap.kf,
    lambdaN: compCap.lambdaN,
    alphaC: compCap.alphaC,
    combinedSectionRatio,
    combinedMemberRatio,
  };

  const results: CapacityResults = {
    Mmax: factored.Mmax,
    Vmax: factored.Vmax,
    sectionClass: secCap.sectionClass,
    fy,
    Ze: secCap.Ze,
    phiMs: secCap.phiMs,
    phiMbx: memCap.phiMbx,
    phiVv: shear.phiVv,
    Le: Le_m * 1000,
    alphaM,
    alphaS: memCap.alphaS,
    deflectionGpsiLQ: deflGpsiLQ,
    deflectionG: deflG,
    deflectionLimitGpsiLQ: deflLimitGpsiLQ,
    deflectionLimitG: deflLimitG,
    passes: {
      sectionMoment,
      memberMoment,
      shear: shearPass,
      deflectionGpsiLQ,
      deflectionG,
      combinedSection,
      combinedMember,
      overall,
    },
    intermediates,
  };

  const diagrams: DiagramSet = {
    factored: factored.bmd,
    serviceability: servic.bmd,
    dead: dead.bmd,
    deflectionGpsiLQ: calcDeflectionProfile(inputs, 'G+ψ_l·Q', psiL),
    deflectionG: calcDeflectionProfile(inputs, 'G'),
  };

  return { results, diagrams };
}
