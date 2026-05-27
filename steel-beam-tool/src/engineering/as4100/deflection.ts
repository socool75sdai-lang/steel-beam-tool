import type { DesignInputs, DeflectionProfilePoint } from '@/types';
import { calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';
import { supportEndMoments } from '@/engineering/as1170/loadCombinations';

/**
 * Downward deflection (mm) contributed by the hogging support end moments mA, mB
 * (N·mm) on a simply-supported span, evaluated at x (mm). EI in N·mm².
 * Derived from EI·v = M_internal·g(x), g(x) = x²/2 − x³/(6L) − Lx/3, with
 * M_internal = −mA at A and −mB at B; downward δ = −v.
 */
function endMomentDeflection(mA: number, mB: number, L: number, EI: number, x: number): number {
  if (EI <= 0 || L <= 0 || (mA === 0 && mB === 0)) return 0;
  const g = (t: number): number => (t * t) / 2 - (t * t * t) / (6 * L) - (L * t) / 3;
  return (mA * g(x) + mB * g(L - x)) / EI;
}

export interface DeflectionResult {
  midspan: number; // mm
  max: number; // mm
  position: number; // m
}

interface CalcPointLoad {
  P: number; // N
  a: number; // mm
}

interface CalcLineLoad {
  w: number; // N/mm
  a: number; // mm
  b: number; // mm
}

/**
 * Deflection of point load P (N) at position a (mm) on simply-supported beam,
 * evaluated at x (mm). EI in N·mm². Returns mm (positive = downward).
 */
function deflectionPointLoad(P: number, a: number, L: number, EI: number, x: number): number {
  if (EI <= 0 || L <= 0) return 0;
  const b = L - a;
  if (x <= a) {
    return (P * b * x * (L * L - b * b - x * x)) / (6 * L * EI);
  }
  return (P * a * (L - x) * (2 * L * x - a * a - x * x)) / (6 * L * EI);
}

/**
 * Deflection of partial UDL w (N/mm) over [a, b] (mm), evaluated at x (mm),
 * by strip summation with N=100 strips. EI in N·mm². Returns mm.
 */
function deflectionPartialUDL(
  w: number,
  a: number,
  b: number,
  L: number,
  EI: number,
  x: number,
): number {
  if (b <= a || w === 0) return 0;
  const N = 100;
  const dStrip = (b - a) / N;
  let total = 0;
  for (let i = 0; i < N; i++) {
    const centre = a + (i + 0.5) * dStrip;
    const dP = w * dStrip;
    total += deflectionPointLoad(dP, centre, L, EI, x);
  }
  return total;
}

/**
 * Elastic mid-span and max deflection of a simply-supported beam by load
 * superposition. Combo factors applied internally.
 */
export function calcDeflection(
  inputs: DesignInputs,
  combo: 'G+ψ_l·Q' | 'G',
  psiL = 1.0,
): DeflectionResult {
  const E = 200_000; // MPa = N/mm²
  const EI = E * inputs.section.Ix; // N·mm²
  const L = inputs.span * 1000; // mm

  const gFactor = 1.0;
  const qFactor = combo === 'G+ψ_l·Q' ? psiL : 0.0;

  const pointLoads: CalcPointLoad[] = [];
  const lineLoads: CalcLineLoad[] = [];

  // Point loads (kN -> N) at position (m -> mm)
  for (const pl of inputs.loads.point) {
    const f = pl.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    pointLoads.push({
      P: pl.magnitude * 1000 * f,
      a: (pl.position / 100) * inputs.span * 1000,
    });
  }

  // Line loads (kN/m == N/mm) over [start, end] in m -> mm
  for (const ll of inputs.loads.line) {
    const f = ll.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    lineLoads.push({
      w: ll.magnitude * f,
      a: ll.start * 1000,
      b: ll.end * 1000,
    });
  }

  // Area loads (kPa * tributaryWidth m -> kN/m == N/mm)
  for (const al of inputs.loads.area) {
    const f = al.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    const wKnPerM = al.magnitude * inputs.tributaryWidth;
    lineLoads.push({
      w: wKnPerM * f,
      a: al.start * 1000,
      b: al.end * 1000,
    });
  }

  // Self-weight UDL (G), full span
  const swKnPerM = calcSelfWeightKnPerM(inputs.section);
  if (swKnPerM > 0) {
    lineLoads.push({
      w: swKnPerM * gFactor,
      a: 0,
      b: L,
    });
  }

  // Fixed-end support moments (N·mm) for the selected support condition
  const { mA, mB } = supportEndMoments(
    pointLoads.map((p) => ({ P: p.P, a: p.a })),
    lineLoads.map((l) => ({ w: l.w, a: l.a, b: l.b })),
    L,
    inputs.supportCondition,
  );

  // Sample at 81 points
  const samples = 81;
  let midspan = 0;
  let maxAbs = 0;
  let maxX = 0;

  for (let i = 0; i < samples; i++) {
    const x = (L * i) / (samples - 1);
    let delta = 0;
    for (const p of pointLoads) {
      delta += deflectionPointLoad(p.P, p.a, L, EI, x);
    }
    for (const w of lineLoads) {
      delta += deflectionPartialUDL(w.w, w.a, w.b, L, EI, x);
    }
    delta += endMomentDeflection(mA, mB, L, EI, x);
    if (Math.abs(x - L / 2) < 1e-6) {
      midspan = delta;
    }
    if (Math.abs(delta) > Math.abs(maxAbs)) {
      maxAbs = delta;
      maxX = x;
    }
  }

  // If 81 samples don't land exactly on midspan (81 → step L/80, index 40 hits L/2)
  // index 40 = L * 40/80 = L/2 ✓

  return {
    midspan,
    max: Math.abs(maxAbs),
    position: maxX / 1000,
  };
}

/**
 * Full elastic deflection profile (81 points) of a simply-supported beam by
 * load superposition. Same load assembly and unit conventions as calcDeflection;
 * returns the per-station deflection rather than just the max/midspan.
 */
export function calcDeflectionProfile(
  inputs: DesignInputs,
  combo: 'G+ψ_l·Q' | 'G',
  psiL = 1.0,
): DeflectionProfilePoint[] {
  const E = 200_000; // MPa = N/mm²
  const EI = E * inputs.section.Ix; // N·mm²
  const L = inputs.span * 1000; // mm

  const gFactor = 1.0;
  const qFactor = combo === 'G+ψ_l·Q' ? psiL : 0.0;

  const pointLoads: CalcPointLoad[] = [];
  const lineLoads: CalcLineLoad[] = [];

  for (const pl of inputs.loads.point) {
    const f = pl.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    pointLoads.push({ P: pl.magnitude * 1000 * f, a: (pl.position / 100) * inputs.span * 1000 });
  }

  for (const ll of inputs.loads.line) {
    const f = ll.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    lineLoads.push({ w: ll.magnitude * f, a: ll.start * 1000, b: ll.end * 1000 });
  }

  for (const al of inputs.loads.area) {
    const f = al.category === 'G' ? gFactor : qFactor;
    if (f === 0) continue;
    const wKnPerM = al.magnitude * inputs.tributaryWidth;
    lineLoads.push({ w: wKnPerM * f, a: al.start * 1000, b: al.end * 1000 });
  }

  const swKnPerM = calcSelfWeightKnPerM(inputs.section);
  if (swKnPerM > 0) {
    lineLoads.push({ w: swKnPerM * gFactor, a: 0, b: L });
  }

  const { mA, mB } = supportEndMoments(
    pointLoads.map((p) => ({ P: p.P, a: p.a })),
    lineLoads.map((l) => ({ w: l.w, a: l.a, b: l.b })),
    L,
    inputs.supportCondition,
  );

  const samples = 81;
  const profile: DeflectionProfilePoint[] = [];
  for (let i = 0; i < samples; i++) {
    const x = (L * i) / (samples - 1);
    let delta = 0;
    for (const p of pointLoads) delta += deflectionPointLoad(p.P, p.a, L, EI, x);
    for (const w of lineLoads) delta += deflectionPartialUDL(w.w, w.a, w.b, L, EI, x);
    delta += endMomentDeflection(mA, mB, L, EI, x);
    profile.push({ x: x / 1000, delta });
  }
  return profile;
}
