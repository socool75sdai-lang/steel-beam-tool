import type { DesignInputs, DiagramPoint, ComboName, SupportCondition } from '@/types';
import { calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';

interface MomentPointLoad {
  P: number; // magnitude (consistent force units)
  a: number; // distance from left support A (same length units as L)
}
interface MomentLineLoad {
  w: number; // intensity (force / length)
  a: number; // start from A
  b: number; // end from A
}

/**
 * Hogging-positive support end moments (M_A at left, M_B at right) for the given
 * support condition, by exact superposition of standard structural-mechanics
 * results. Partial UDLs are integrated by strip summation of the point-load case.
 * Unit-agnostic: returns moments in (force × length) of the inputs.
 *
 * - FF: fixed-end moments M_A = Pab²/L², M_B = Pa²b/L²
 * - FP (A fixed, B pin): M_A = P·b·(L²−b²)/(2L²) (propped cantilever), M_B = 0
 * - PF (A pin, B fixed): M_B = P·a·(L²−a²)/(2L²), M_A = 0
 * - PP: zero
 */
export function supportEndMoments(
  points: MomentPointLoad[],
  lines: MomentLineLoad[],
  L: number,
  support: SupportCondition,
): { mA: number; mB: number } {
  if (support === 'PP' || L <= 0) return { mA: 0, mB: 0 };

  let mA = 0;
  let mB = 0;
  const addPoint = (P: number, a: number): void => {
    const b = L - a;
    if (a <= 0 || b <= 0 || P === 0) return;
    if (support === 'FF') {
      mA += (P * a * b * b) / (L * L);
      mB += (P * a * a * b) / (L * L);
    } else if (support === 'FP') {
      mA += (P * b * (L * L - b * b)) / (2 * L * L);
    } else if (support === 'PF') {
      mB += (P * a * (L * L - a * a)) / (2 * L * L);
    }
  };

  for (const p of points) addPoint(p.P, p.a);
  for (const ll of lines) {
    if (ll.b <= ll.a || ll.w === 0) continue;
    const N = 100;
    const ds = (ll.b - ll.a) / N;
    for (let i = 0; i < N; i++) {
      addPoint(ll.w * ds, ll.a + (i + 0.5) * ds);
    }
  }
  return { mA, mB };
}

export interface ComboFactors {
  name: ComboName;
  g: number;
  q: number;
}

export const COMBOS: ComboFactors[] = [
  { name: '1.2G+1.5Q', g: 1.2, q: 1.5 },
  { name: 'G+Q', g: 1.0, q: 1.0 },
  { name: 'G', g: 1.0, q: 0.0 },
];

export interface CombinedLoads {
  point: { magnitude: number; position: number }[];
  line: { magnitude: number; start: number; end: number }[];
}

export function combineLoads(inputs: DesignInputs, combo: ComboFactors): CombinedLoads {
  const point: { magnitude: number; position: number }[] = [];
  const line: { magnitude: number; start: number; end: number }[] = [];

  for (const p of inputs.loads.point) {
    const factor = p.category === 'G' ? combo.g : combo.q;
    point.push({ magnitude: p.magnitude * factor, position: (p.position / 100) * inputs.span });
  }

  for (const l of inputs.loads.line) {
    const factor = l.category === 'G' ? combo.g : combo.q;
    line.push({ magnitude: l.magnitude * factor, start: l.start, end: l.end });
  }

  for (const a of inputs.loads.area) {
    const factor = a.category === 'G' ? combo.g : combo.q;
    const wKnPerM = a.magnitude * inputs.tributaryWidth;
    line.push({ magnitude: wKnPerM * factor, start: a.start, end: a.end });
  }

  // Self-weight (always G)
  const wSw = calcSelfWeightKnPerM(inputs.section);
  line.push({ magnitude: wSw * combo.g, start: 0, end: inputs.span });

  return { point, line };
}

export interface AnalysisResult {
  bmd: DiagramPoint[];
  sfd: DiagramPoint[];
  Mmax: number;
  Vmax: number;
  reactions: { Ra: number; Rb: number };
  femA: number; // kN·m, hogging positive (support end moment at A)
  femB: number; // kN·m, hogging positive (support end moment at B)
}

export function analyseBeam(inputs: DesignInputs, combo: ComboFactors): AnalysisResult {
  const L = inputs.span;
  const N = 201;
  const combined = combineLoads(inputs, combo);

  const samples: DiagramPoint[] = [];
  for (let i = 0; i < N; i++) {
    samples.push({ x: (i * L) / (N - 1), moment: 0, shear: 0 });
  }

  let totalRa = 0;
  let totalRb = 0;

  // Point loads
  for (const p of combined.point) {
    const P = p.magnitude;
    const a = p.position;
    const Rb = (P * a) / L;
    const Ra = P - Rb;
    totalRa += Ra;
    totalRb += Rb;

    for (const s of samples) {
      s.moment += Ra * s.x;
      s.shear += Ra;
      if (s.x > a) {
        s.moment -= P * (s.x - a);
        s.shear -= P;
      }
    }
  }

  // Line loads (UDL over [a,b])
  for (const ll of combined.line) {
    const w = ll.magnitude;
    const a = ll.start;
    const b = ll.end;
    if (b <= a) continue;
    const W = w * (b - a);
    const centroid = (a + b) / 2;
    const Rb = (W * centroid) / L;
    const Ra = W - Rb;
    totalRa += Ra;
    totalRb += Rb;

    for (const s of samples) {
      s.moment += Ra * s.x;
      s.shear += Ra;
      if (s.x > a && s.x <= b) {
        s.moment -= (w * (s.x - a) * (s.x - a)) / 2;
        s.shear -= w * (s.x - a);
      } else if (s.x > b) {
        s.moment -= w * (b - a) * (s.x - centroid);
        s.shear -= w * (b - a);
      }
    }
  }

  // Fixed-end correction: superpose the linearly-varying support-moment diagram
  // M_supp(x) = −mA·(1 − x/L) − mB·(x/L) (sagging convention) onto the SS result,
  // and the constant shear (mA − mB)/L it induces. PP → mA = mB = 0 (unchanged).
  const { mA, mB } = supportEndMoments(
    combined.point.map((p) => ({ P: p.magnitude, a: p.position })),
    combined.line.map((l) => ({ w: l.magnitude, a: l.start, b: l.end })),
    L,
    inputs.supportCondition,
  );
  if (mA !== 0 || mB !== 0) {
    const dShear = (mA - mB) / L;
    for (const s of samples) {
      s.moment += -mA * (1 - s.x / L) - mB * (s.x / L);
      s.shear += dShear;
    }
    totalRa += dShear;
    totalRb -= dShear;
  }

  let Mmax = 0;
  let Vmax = 0;
  for (const s of samples) {
    const am = Math.abs(s.moment);
    const av = Math.abs(s.shear);
    if (am > Mmax) Mmax = am;
    if (av > Vmax) Vmax = av;
  }

  return {
    bmd: samples,
    sfd: samples,
    Mmax,
    Vmax,
    reactions: { Ra: totalRa, Rb: totalRb },
    femA: mA,
    femB: mB,
  };
}
