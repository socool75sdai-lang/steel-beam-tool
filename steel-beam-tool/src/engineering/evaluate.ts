import type { DesignInputs, CapacityResults, DiagramSet } from '@/types';
import { COMBOS, analyseBeam } from '@/engineering/as1170/loadCombinations';
import { calcFy } from '@/engineering/sections/sectionUtils';
import {
  calcSectionCapacity,
  calcMemberCapacity,
} from '@/engineering/as4100/momentCapacity';
import { calcShearCapacity } from '@/engineering/as4100/shearCapacity';
import { calcDeflection } from '@/engineering/as4100/deflection';
import {
  calcEffectiveLength,
  calcAlphaM,
} from '@/engineering/as4100/effectiveLength';

export interface EvaluationResult {
  results: CapacityResults;
  diagrams: DiagramSet;
}

export function evaluateDesign(inputs: DesignInputs): EvaluationResult {
  const factored = analyseBeam(inputs, COMBOS[0]); // 1.2G+1.5Q
  const servic = analyseBeam(inputs, COMBOS[1]); // G+Q
  const dead = analyseBeam(inputs, COMBOS[2]); // G

  const fy = calcFy(inputs.section);
  const Le_m = calcEffectiveLength(inputs.span, inputs.restraint);
  const alphaM =
    inputs.restraint.alphaMOverride ?? calcAlphaM(factored.bmd, 0, inputs.span);

  const secCap = calcSectionCapacity(inputs.section, fy);
  const memCap = calcMemberCapacity(inputs.section, fy, Le_m * 1000, alphaM);
  const shear = calcShearCapacity(inputs.section, fy);

  const deflGQ = calcDeflection(inputs, 'G+Q').max;
  const deflG = calcDeflection(inputs, 'G').max;
  const deflLimitGQ = (inputs.span * 1000) / inputs.deflLimits.GQ;
  const deflLimitG = (inputs.span * 1000) / inputs.deflLimits.G;

  const sectionMoment = factored.Mmax <= secCap.phiMs;
  const memberMoment = factored.Mmax <= memCap.phiMbx;
  const shearPass = factored.Vmax <= shear.phiVv;
  const deflectionGQ = deflGQ <= deflLimitGQ;
  const deflectionG = deflG <= deflLimitG;
  const overall =
    sectionMoment && memberMoment && shearPass && deflectionGQ && deflectionG;

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
    deflectionGQ: deflGQ,
    deflectionG: deflG,
    deflectionLimitGQ: deflLimitGQ,
    deflectionLimitG: deflLimitG,
    passes: {
      sectionMoment,
      memberMoment,
      shear: shearPass,
      deflectionGQ,
      deflectionG,
      overall,
    },
  };

  const diagrams: DiagramSet = {
    factored: factored.bmd,
    serviceability: servic.bmd,
    dead: dead.bmd,
  };

  return { results, diagrams };
}
