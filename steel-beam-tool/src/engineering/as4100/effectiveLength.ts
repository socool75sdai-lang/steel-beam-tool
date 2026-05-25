import type { RestraintConfig, DiagramPoint, EndRestraint } from '@/types';

const advancedTable: Record<string, number> = {
  FF: 1.0,
  FP: 1.1,
  FL: 1.2,
  FU: 1.4,
  PP: 1.2,
  PL: 1.3,
  PU: 1.5,
  LL: 1.4,
  LU: 1.6,
  UU: 2.5,
};

function endPairMultiplier(a: EndRestraint, b: EndRestraint): number {
  const k1 = `${a}${b}`;
  const k2 = `${b}${a}`;
  return advancedTable[k1] ?? advancedTable[k2] ?? 1.5;
}

function simpleMultiplier(restraint: RestraintConfig): number {
  switch (restraint.simpleType) {
    case 'FF':
      return 1.0;
    case 'PP':
      return 1.0;
    case 'PF':
      return 1.2;
    case 'FC':
      return 0.7;
    case 'custom': {
      const m = restraint.leMultiplier;
      return Number.isFinite(m) && m > 0 ? m : 1.0;
    }
    default:
      return 1.0;
  }
}

/**
 * Returns Le in metres given the span (m) and restraint configuration.
 * Uses the longest unsupported segment length when intermediate restraints are present.
 */
export function calcEffectiveLength(span_m: number, restraint: RestraintConfig): number {
  if (!Number.isFinite(span_m) || span_m <= 0) return 0;

  if (restraint.mode === 'simple') {
    return span_m * simpleMultiplier(restraint);
  }

  // advanced
  const intermediate = (restraint.intermediate ?? [])
    .filter((x) => Number.isFinite(x) && x > 0 && x < span_m)
    .slice()
    .sort((a, b) => a - b);

  if (intermediate.length === 0) {
    return span_m * endPairMultiplier(restraint.endA, restraint.endB);
  }

  const points = [0, ...intermediate, span_m];
  let maxLe = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segLen = points[i + 1] - points[i];
    let mult: number;
    if (i === 0) {
      // first segment: endA -> F (intermediate treated as F)
      mult = endPairMultiplier(restraint.endA, 'F');
    } else if (i === points.length - 2) {
      // last segment: F -> endB
      mult = endPairMultiplier('F', restraint.endB);
    } else {
      // inner segment: F -> F
      mult = 1.0;
    }
    const segLe = segLen * mult;
    if (segLe > maxLe) maxLe = segLe;
  }
  return maxLe;
}

function interpolateMoment(bmd: DiagramPoint[], targetX: number): number {
  if (bmd.length === 0) return 0;
  if (targetX <= bmd[0].x) return bmd[0].moment;
  if (targetX >= bmd[bmd.length - 1].x) return bmd[bmd.length - 1].moment;
  for (let i = 0; i < bmd.length - 1; i++) {
    const a = bmd[i];
    const b = bmd[i + 1];
    if (targetX >= a.x && targetX <= b.x) {
      const dx = b.x - a.x;
      if (dx === 0) return a.moment;
      const t = (targetX - a.x) / dx;
      return a.moment + t * (b.moment - a.moment);
    }
  }
  return 0;
}

/**
 * Moment modification factor αm from BMD samples for segment [segmentStart_m, segmentEnd_m].
 * αm = clamp(1.7 · |Mmax| / sqrt(M2² + M3² + M4²), 1.0, 2.5).
 */
export function calcAlphaM(
  bmd: DiagramPoint[],
  segmentStart_m: number,
  segmentEnd_m: number,
): number {
  const segLen = segmentEnd_m - segmentStart_m;
  if (!Number.isFinite(segLen) || segLen <= 0) return 1.0;

  const tol = 1e-9;
  const inSeg = bmd.filter(
    (p) => p.x >= segmentStart_m - tol && p.x <= segmentEnd_m + tol,
  );
  if (inSeg.length === 0) return 1.0;

  const quarterLen = segLen / 4;
  const M2 = interpolateMoment(bmd, segmentStart_m + quarterLen);
  const M3 = interpolateMoment(bmd, segmentStart_m + 2 * quarterLen);
  const M4 = interpolateMoment(bmd, segmentStart_m + 3 * quarterLen);

  let Mmax = 0;
  for (const p of inSeg) {
    const abs = Math.abs(p.moment);
    if (abs > Mmax) Mmax = abs;
  }
  // Also consider quarter-point interpolated values as candidates
  Mmax = Math.max(Mmax, Math.abs(M2), Math.abs(M3), Math.abs(M4));

  const denom = Math.sqrt(M2 * M2 + M3 * M3 + M4 * M4);
  if (denom === 0) return 1.0;

  const alphaM = (1.7 * Mmax) / denom;
  return Math.max(1.0, Math.min(2.5, alphaM));
}
