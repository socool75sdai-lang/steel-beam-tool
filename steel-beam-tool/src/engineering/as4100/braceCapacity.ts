import type { BraceInputs, BraceResults, BraceIntermediates, BraceBmdPoint, BraceDeflPoint } from '@/types/brace';
import { calcFyHollow, calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';
import { calcSectionCapacity } from '@/engineering/as4100/momentCapacity';
import { calcAlphaC } from '@/engineering/as4100/compressionCapacity';
import { getPsiC, getPsiL, LIVE_LOAD_LABELS } from '@/engineering/as1170/psiFactors';

const PHI = 0.9;
const E = 200_000; // MPa = N/mm²
const N_SAMPLES = 41;

interface UDL {
  w: number; // kN/m
}
interface PL {
  P: number; // kN (signed)
  a: number; // m
}

/** Simply-supported major-axis BMD (kN·m, + sagging) for a full-span UDL + point loads. */
function buildBmd(L: number, udl: UDL, points: PL[]): BraceBmdPoint[] {
  const out: BraceBmdPoint[] = [];
  if (L <= 0) return [{ x: 0, moment: 0 }];
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (L * i) / (N_SAMPLES - 1);
    let m = (udl.w * x * (L - x)) / 2; // UDL
    for (const p of points) {
      const Ra = (p.P * (L - p.a)) / L;
      m += x <= p.a ? Ra * x : Ra * x - p.P * (x - p.a);
    }
    out.push({ x, moment: m });
  }
  return out;
}

function peakAbs(bmd: BraceBmdPoint[]): number {
  let m = 0;
  for (const p of bmd) if (Math.abs(p.moment) > m) m = Math.abs(p.moment);
  return m;
}

/** Self-weight (UDL) deflection profile (mm) of a simply-supported span. */
function selfWeightDeflection(L_m: number, wKnPerM: number, EI: number): BraceDeflPoint[] {
  const out: BraceDeflPoint[] = [];
  const L = L_m * 1000; // mm
  const w = wKnPerM; // N/mm (kN/m == N/mm)
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (L * i) / (N_SAMPLES - 1);
    const delta = EI > 0 ? (w * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI) : 0;
    out.push({ x: x / 1000, delta });
  }
  return out;
}

/**
 * AS4100 horizontal beam-column (Steel Brace, Rev 6 Item 2): Cl. 6 axial buckling
 * (closed section, reusing the column path) + major-axis bending from self-weight
 * and transverse point loads + Cl. 8.3/8.4 combined actions. A single factored N*
 * is applied in every combination; the bending M* is the worst of three combos.
 */
export function evaluateBrace(inputs: BraceInputs): BraceResults {
  const { section, span, kx, ky, nStar, pointLoads } = inputs;
  const L = span;

  const fy = calcFyHollow(inputs.steelGrade);
  const Ag = section.Ag;
  const kf = 1.0;

  // --- Axial (reuse the column hollow-section path) ---
  const rX = Ag > 0 ? Math.sqrt(section.Ix / Ag) : 0;
  const rY = Ag > 0 ? Math.sqrt(section.Iy / Ag) : 0;
  const LeX = kx * L;
  const LeY = ky * L;
  const phiNs = (PHI * kf * Ag * fy) / 1000;
  const lambdaNX = rX > 0 ? ((LeX * 1000) / rX) * Math.sqrt((kf * fy) / 250) : 0;
  const lambdaNY = rY > 0 ? ((LeY * 1000) / rY) * Math.sqrt((kf * fy) / 250) : 0;
  const alphaCX = calcAlphaC(lambdaNX);
  const alphaCY = calcAlphaC(lambdaNY);
  const phiNcX = (PHI * alphaCX * kf * Ag * fy) / 1000;
  const phiNcY = (PHI * alphaCY * kf * Ag * fy) / 1000;
  const phiNc = Math.min(phiNcX, phiNcY);

  // --- Bending section capacity (major axis); closed section => no LTB ---
  const secCap = calcSectionCapacity(section, fy);
  const phiMsx = secCap.phiMs;
  const phiMbx = phiMsx; // no LTB
  const ZeX = secCap.Ze;
  const sectionClass = secCap.sectionClass;

  // --- Transverse loads -> worst-of-3-combos major-axis M* ---
  const psiC = getPsiC(inputs.liveLoadType);
  const psiL = getPsiL(inputs.liveLoadType);
  const wSw = calcSelfWeightKnPerM(section); // kN/m (G)

  const gPts = pointLoads.filter((p) => p.tag === 'G');
  const qPts = pointLoads.filter((p) => p.tag === 'Q');
  const wPts = pointLoads.filter((p) => p.tag === 'Wind');

  const scale = (pts: typeof pointLoads, f: number): PL[] =>
    pts.map((p) => ({ P: p.magnitude * f, a: p.position }));

  // Combo factors: [G(self-weight + G points), Q points, Wind points]
  const combos: { label: string; g: number; q: number; wind: number }[] = [
    { label: '1.2G + 1.5Q', g: 1.2, q: 1.5, wind: 0 },
    { label: '1.2G + Wu + ψc·Q', g: 1.2, q: psiC, wind: 1.0 },
    { label: '0.9G + Wu', g: 0.9, q: 0, wind: 1.0 },
  ];

  let govBmd: BraceBmdPoint[] = buildBmd(L, { w: 0 }, []);
  let mStar = 0;
  let govCombo = combos[0].label;
  for (const c of combos) {
    const pts = [...scale(gPts, c.g), ...scale(qPts, c.q), ...scale(wPts, c.wind)];
    const bmd = buildBmd(L, { w: wSw * c.g }, pts);
    const peak = peakAbs(bmd);
    if (peak >= mStar) {
      mStar = peak;
      govBmd = bmd;
      govCombo = c.label;
    }
  }

  // --- Self-weight deflection ---
  const EI = E * section.Ix; // N·mm²
  const deflectionProfile = selfWeightDeflection(L, wSw, EI);
  let deflection = 0;
  for (const p of deflectionProfile) if (Math.abs(p.delta) > deflection) deflection = Math.abs(p.delta);
  const deflectionLimit = (L * 1000) / inputs.deflLimit;

  // --- Utilisations & combined actions (M*y = 0) ---
  const utilNs = phiNs > 0 ? nStar / phiNs : Infinity;
  const utilNcX = phiNcX > 0 ? nStar / phiNcX : Infinity;
  const utilNcY = phiNcY > 0 ? nStar / phiNcY : Infinity;
  const utilMsx = phiMsx > 0 ? mStar / phiMsx : Infinity;

  const ratioSection = (phiNs > 0 ? nStar / phiNs : Infinity) + (phiMsx > 0 ? mStar / phiMsx : 0); // Cl. 8.3.3
  const ratioMemberInplane = (phiNc > 0 ? nStar / phiNc : Infinity) + (phiMsx > 0 ? mStar / phiMsx : 0); // Cl. 8.4.2
  const ratioMemberOutofplane = (phiNc > 0 ? nStar / phiNc : Infinity) + (phiMbx > 0 ? mStar / phiMbx : 0); // Cl. 8.4.4

  const axialSection = utilNs <= 1;
  const axialMemberX = utilNcX <= 1;
  const axialMemberY = utilNcY <= 1;
  const bending = utilMsx <= 1;
  const combinedSection = ratioSection <= 1;
  const combinedMemberInplane = ratioMemberInplane <= 1;
  const combinedMemberOutofplane = ratioMemberOutofplane <= 1;
  const deflectionPass = deflection <= deflectionLimit;
  const overall =
    axialSection &&
    axialMemberX &&
    axialMemberY &&
    bending &&
    combinedSection &&
    combinedMemberInplane &&
    combinedMemberOutofplane &&
    deflectionPass;

  const intermediates: BraceIntermediates = {
    fy,
    kf,
    LeX,
    LeY,
    rX,
    rY,
    lambdaNX,
    lambdaNY,
    alphaCX,
    alphaCY,
    sectionClass,
    ZeX,
    psiC,
    psiL,
    liveLoadTypeLabel: LIVE_LOAD_LABELS[inputs.liveLoadType],
    selfWeightKnPerM: wSw,
    govComboLabel: govCombo,
    EI,
  };

  return {
    phiNs,
    phiNcX,
    phiNcY,
    phiNc,
    phiMsx,
    phiMbx,
    nStar,
    mStar,
    govCombo,
    utilNs,
    utilNcX,
    utilNcY,
    utilMsx,
    ratioSection,
    ratioMemberInplane,
    ratioMemberOutofplane,
    deflection,
    deflectionLimit,
    bmd: govBmd,
    deflectionProfile,
    passes: {
      axialSection,
      axialMemberX,
      axialMemberY,
      bending,
      combinedSection,
      combinedMemberInplane,
      combinedMemberOutofplane,
      deflection: deflectionPass,
      overall,
    },
    intermediates,
  };
}
