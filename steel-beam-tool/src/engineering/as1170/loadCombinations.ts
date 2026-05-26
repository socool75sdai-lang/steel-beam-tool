import type { DesignInputs, DiagramPoint, ComboName } from '@/types';
import { calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';

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
  };
}
