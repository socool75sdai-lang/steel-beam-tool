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
 * A candidate lateral-torsional-buckling segment: a length of beam between two
 * restraint points whose compression flange is restrained at both ends. `flange`
 * is the compression flange over the segment (from the BMD sign); `Le` already
 * includes the end-pair effective-length multiplier; `alphaM` is the segment's
 * own moment-modification factor.
 */
export interface LtbSegment {
  start: number; // m
  end: number; // m
  flange: 'top' | 'bottom';
  Le: number; // m
  alphaM: number;
}

/**
 * Signed moment of largest magnitude within [a, b] (m). Positive = sagging
 * (top flange in compression); negative = hogging (bottom flange in compression).
 */
function segmentPeakSignedMoment(bmd: DiagramPoint[], a: number, b: number): number {
  const tol = 1e-9;
  let peak = interpolateMoment(bmd, a);
  const consider = (m: number): void => {
    if (Math.abs(m) > Math.abs(peak)) peak = m;
  };
  consider(interpolateMoment(bmd, b));
  for (const p of bmd) {
    if (p.x >= a - tol && p.x <= b + tol) consider(p.moment);
  }
  return peak;
}

/** Restraint type at a boundary x: span ends use endA/endB, interior points act as 'F'. */
function boundaryType(x: number, span: number, endA: EndRestraint, endB: EndRestraint): EndRestraint {
  const tol = 1e-9;
  if (Math.abs(x) <= tol) return endA;
  if (Math.abs(x - span) <= tol) return endB;
  return 'F';
}

/**
 * Build the governing-segment LTB candidates (Rev 6, Item 1). Each flange's
 * intermediate restraints segment the beam independently; a segment is a real
 * LTB candidate only where its compression flange is the restrained one:
 *  - top-flange restraints govern sagging (M > 0) segments,
 *  - bottom-flange restraints govern hogging (M < 0) segments.
 * For a plain PP sagging beam every bottom-flange segment is sagging and is
 * therefore skipped (tension flange) — `bottomFlangeNoEffect` flags this so the
 * results read as intended rather than as a bug.
 *
 * Simple mode reproduces the legacy single-segment behaviour (whole-span Le and
 * αm) so nothing changes there.
 */
export function buildLtbSegments(
  span_m: number,
  restraint: RestraintConfig,
  bmd: DiagramPoint[],
): { segments: LtbSegment[]; bottomFlangeNoEffect: boolean } {
  if (!Number.isFinite(span_m) || span_m <= 0) {
    return { segments: [{ start: 0, end: 0, flange: 'top', Le: 0, alphaM: 1.0 }], bottomFlangeNoEffect: false };
  }

  // Simple mode: one whole-span segment, Le = span × simple multiplier.
  if (restraint.mode === 'simple') {
    const peak = segmentPeakSignedMoment(bmd, 0, span_m);
    return {
      segments: [
        {
          start: 0,
          end: span_m,
          flange: peak < 0 ? 'bottom' : 'top',
          Le: span_m * simpleMultiplier(restraint),
          alphaM: calcAlphaM(bmd, 0, span_m),
        },
      ],
      bottomFlangeNoEffect: false,
    };
  }

  const { endA, endB } = restraint;

  // Build the segments for one flange pass; include a segment only where its
  // compression flange matches the pass's flange.
  const passSegments = (intermediate: number[], flange: 'top' | 'bottom'): LtbSegment[] => {
    const pts = [0, span_m, ...intermediate.filter((x) => Number.isFinite(x) && x > 0 && x < span_m)]
      .slice()
      .sort((a, b) => a - b);
    // de-duplicate
    const uniq = pts.filter((x, i) => i === 0 || Math.abs(x - pts[i - 1]) > 1e-9);
    const out: LtbSegment[] = [];
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = uniq[i];
      const b = uniq[i + 1];
      const peak = segmentPeakSignedMoment(bmd, a, b);
      const compFlange = peak < 0 ? 'bottom' : 'top';
      if (compFlange !== flange) continue;
      const mult = endPairMultiplier(
        boundaryType(a, span_m, endA, endB),
        boundaryType(b, span_m, endA, endB),
      );
      out.push({ start: a, end: b, flange, Le: (b - a) * mult, alphaM: calcAlphaM(bmd, a, b) });
    }
    return out;
  };

  const topSegments = passSegments(restraint.intermediateTop ?? [], 'top');
  const bottomSegments = passSegments(restraint.intermediateBottom ?? [], 'bottom');
  const bottomFlangeNoEffect = (restraint.intermediateBottom ?? []).length > 0 && bottomSegments.length === 0;

  const segments = [...topSegments, ...bottomSegments];
  if (segments.length === 0) {
    // Degenerate fallback (e.g. an all-hogging span with no bottom restraints):
    // a single whole-span segment using the end-pair multiplier.
    const peak = segmentPeakSignedMoment(bmd, 0, span_m);
    segments.push({
      start: 0,
      end: span_m,
      flange: peak < 0 ? 'bottom' : 'top',
      Le: span_m * endPairMultiplier(endA, endB),
      alphaM: calcAlphaM(bmd, 0, span_m),
    });
  }

  return { segments, bottomFlangeNoEffect };
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
