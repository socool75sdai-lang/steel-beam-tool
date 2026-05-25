# Agent: effective-length

**Wave:** 2
**Depends on:** Wave 1
**Output:** `src/engineering/as4100/effectiveLength.ts`

## Responsibility
Compute effective length `Le` from restraint configuration (AS4100 Section 5) and moment modification factor `αm` (Cl. 5.6.1.1).

## Required exports
```ts
import { RestraintConfig, DiagramPoint } from '@/types';

/**
 * Returns Le in metres given the span (m) and restraint configuration.
 * Use the longest unsupported segment length when intermediate restraints are present.
 */
export function calcEffectiveLength(span_m: number, restraint: RestraintConfig): number;

/**
 * Moment modification factor αm from BMD samples.
 * α m = min(2.5, 1.7 · |Mmax| / sqrt(M2² + M3² + M4²))
 * where M2 = moment at 1/4·L, M3 at 1/2·L, M4 at 3/4·L (of the segment).
 * Default to 1.0 when |Mmax| is zero or the denominator collapses.
 */
export function calcAlphaM(bmd: DiagramPoint[], segmentStart_m: number, segmentEnd_m: number): number;
```

## Simple-mode multipliers
| `simpleType` | `Le / L` |
|--------------|----------|
| `'FF'` | 1.0 |
| `'PP'` | 1.0 |
| `'PF'` | 1.2 |
| `'FC'` | 0.7 |
| `'custom'` | `restraint.leMultiplier` |

## Advanced-mode (per AS4100 Table 5.6.3)
Determine `kt`, `kl`, `kr` factors based on end restraint categories at each segment end:

Approximate table mapping (use for v1):

| End A | End B | `Le / L` |
|-------|-------|----------|
| F | F | 1.0 |
| F | P | 1.1 |
| F | L | 1.2 |
| F | U | 1.4 |
| P | P | 1.2 |
| P | L | 1.3 |
| P | U | 1.5 |
| L | L | 1.4 |
| L | U | 1.6 |
| U | U | 2.5 |

(Symmetric — End B/End A swap gives same value.)

## Intermediate restraints
Treat as creating segments. The critical `Le` is the longest segment length × restraint factor (use 1.0 for fully restrained inter-segments, or apply the same end-category rules when one end is an intermediate restraint).

For v1, simplification: if intermediate restraints exist, use the longest gap between (end, restraint points, end) as the unsupported length, multiplied by 1.0.

## αm calculation
Given `bmd: DiagramPoint[]` (sorted by `x`), for segment `[segmentStart_m, segmentEnd_m]`:
1. Filter BMD samples within segment.
2. Find `Mmax` = max absolute moment in segment.
3. Compute `M2, M3, M4` at quarter-points by linear interpolation from BMD samples.
4. `denom = sqrt(M2² + M3² + M4²)`
5. If `denom === 0`: return 1.0.
6. `αm = 1.7 · |Mmax| / denom`
7. Clamp `αm` to `[1.0, 2.5]`.

## Acceptance criteria
- Simple FF, 6 m span → `Le = 6 m`.
- Simple FC, 6 m span → `Le = 4.2 m`.
- Simple custom with `leMultiplier = 1.5`, 6 m → `Le = 9 m`.
- Uniform moment BMD → `αm ≈ 1.0`.
- Simply-supported beam with mid-span point load → `αm ≈ 1.35` (typical).
- `npx tsc --noEmit` passes.
