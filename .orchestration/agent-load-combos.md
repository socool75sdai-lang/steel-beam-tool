# Agent: load-combinations

**Wave:** 2
**Depends on:** Wave 1
**Output:** `src/engineering/as1170/loadCombinations.ts`

## Responsibility
Combine raw loads into factored line-load streams, then compute BMD/SFD using simple-beam superposition.

## Required exports
```ts
import {
  DesignInputs, LineLoad, PointLoad, DiagramPoint,
  ComboName, LoadCategory,
} from '@/types';

export interface ComboFactors { name: ComboName; g: number; q: number; }

export const COMBOS: ComboFactors[] = [
  { name: '1.2G+1.5Q', g: 1.2, q: 1.5 },
  { name: 'G+Q',       g: 1.0, q: 1.0 },
  { name: 'G',         g: 1.0, q: 0.0 },
];

export interface CombinedLoads {
  point: { magnitude: number; position: number }[];   // pre-factored
  line:  { magnitude: number; start: number; end: number }[];
}

/**
 * Convert all inputs (area→line via tributary width, auto self-weight as G,
 * apply combo factors) into a flat list of factored point + line loads.
 */
export function combineLoads(inputs: DesignInputs, combo: ComboFactors): CombinedLoads;

export interface AnalysisResult {
  bmd: DiagramPoint[];
  sfd: DiagramPoint[];
  Mmax: number;          // kN·m, absolute peak
  Vmax: number;          // kN, absolute peak
  reactions: { Ra: number; Rb: number };
}

/** Compute BMD/SFD for simply-supported beam over [0, span] at 201 evenly-spaced points. */
export function analyseBeam(inputs: DesignInputs, combo: ComboFactors): AnalysisResult;
```

## Analysis details
- Simply-supported beam, supports at `x=0` and `x=span` (metres).
- **Reactions:**
  - Point at position `a`, magnitude `P` → `Rb = P·a/L`, `Ra = P − Rb`
  - UDL `w` over `[a,b]` → resultant `W = w·(b−a)`, centroid at `(a+b)/2`; `Rb = W·centroid/L`, `Ra = W − Rb`
- **Moment at x:**
  - From `Ra`: `+Ra·x`
  - From point load `P` at `a` (only if `x > a`): `−P·(x−a)`
  - From UDL `w` over `[a,b]`:
    - If `x ≤ a`: 0
    - If `a < x ≤ b`: `−w·(x−a)²/2`
    - If `x > b`: `−w·(b−a)·(x − (a+b)/2)`
- **Shear at x:**
  - From `Ra`: `+Ra`
  - From point load (only if `x > a`): `−P`
  - From UDL `w` over `[a,b]`:
    - If `x ≤ a`: 0
    - If `a < x ≤ b`: `−w·(x−a)`
    - If `x > b`: `−w·(b−a)`
- `Mmax = max(|moment|)`, `Vmax = max(|shear|)` across the 201 sample points.

## Self-weight
Use `calcSelfWeightKnPerM(section)` from `sectionUtils`. Inject as an additional `LineLoad { magnitude, start: 0, end: span, category: 'G' }`.

## Area loads
For each `AreaLoad` convert to `LineLoad` via `magnitude = area.magnitude * tributaryWidth` before combination.

## Acceptance criteria
- `analyseBeam({span:6, 200UB25.4, 20kN point load at 3m, G only}, {1.0,0.0})` returns `Mmax ≈ 30 kN·m` (with self-weight contribution it will be slightly higher).
- All loads with `magnitude = 0` produce flat-zero BMD/SFD.
- `npx tsc --noEmit` passes.
