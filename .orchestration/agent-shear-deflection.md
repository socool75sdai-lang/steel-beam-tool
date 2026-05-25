# Agent: shear-deflection

**Wave:** 2
**Depends on:** Wave 1
**Outputs:**
- `src/engineering/as4100/shearCapacity.ts`
- `src/engineering/as4100/deflection.ts`

## Responsibility
AS4100 shear capacity (Cl. 5.11) and elastic deflection of simply-supported beams via load superposition.

---

## shearCapacity.ts

```ts
import { SteelSection } from '@/types';

export interface ShearResult { Aw: number; Vv: number; phiVv: number; webSlender: boolean; }

export function calcShearCapacity(section: SteelSection, fy: number): ShearResult;
```

### Calculation (Cl. 5.11)
- For I-sections / channels: `Aw = d * tw` (mm²)
- For SHS/RHS: `Aw = 2 * d * tw` (two webs in shear)
- For CHS: `Aw = 0.6 * Ag` (approximation)
- For EA: `Aw = d * tw`
- Web slenderness threshold: `(d/tw) ≤ 82 · √(250/fy)`
  - Stocky: `Vv = 0.6 · fy · Aw` (N)
  - Slender: `Vb = Vv · (82·√(250/fy) / (d/tw))²` — AS4100 Cl. 5.11.5 reduction
- `phiVv = 0.9 · Vv / 1000` (kN)

---

## deflection.ts

```ts
import { DesignInputs, ComboName } from '@/types';

export interface DeflectionResult {
  midspan: number;          // mm
  max: number;              // mm
  position: number;         // m
}

/**
 * Calc mid-span and max deflection by elastic superposition for the specified combo.
 * Combo factors applied here.
 */
export function calcDeflection(inputs: DesignInputs, combo: 'G+Q' | 'G'): DeflectionResult;
```

### Calculation
- Use `Ix` in mm⁴, `E = 200_000` MPa, span `L` in mm, loads converted to N or N/mm.
- Self-weight included as G UDL (`(mass_kg_m * 9.81) / 1000 * 1000 / 1000` = `mass_kg_m * 9.81e-3` N/mm).
- Area loads converted to line loads via tributary width.
- Combo `G+Q`: factor 1.0G + 1.0Q. Combo `G`: factor 1.0G + 0.0Q.

For each load, sample deflection at 41 evenly-spaced points and accumulate (superposition):

**Full-span UDL `w` (N/mm):**
At `x`: `δ(x) = (w·x·(L³ − 2·L·x² + x³)) / (24·E·I)`

**Partial UDL `w` over `[a, b]` (mm positions):** use direct integration. For simplicity, divide the load into many narrow strips and treat each strip as a point load `dP = w·dx` at strip centre.

**Point load `P` (N) at `a` (mm):**
- Reactions: `Rb = P·a/L`, `Ra = P − Rb`
- For `x ≤ a`: `δ(x) = (Rb·(L−a)·x · (2·L·a − a² − x²)) / (6·L·E·I)` — equivalent form
- A robust alternative: use unit-load method numerically — sample mid-span and max via tabular formulae:
  - `δ(x ≤ a) = P·b·x·(L² − b² − x²) / (6·L·E·I)`, where `b = L − a`
  - `δ(x > a) = P·a·(L−x)·(2·L·x − a² − x²) / (6·L·E·I)`

### Approach (recommended)
Build a numerical helper:
```ts
function deflectionAtPointLoad(P, a, L, EI, x): number;
function deflectionAtUDL(w, aStart, bEnd, L, EI, x): number;
```
Then sum contributions across all combined loads at each `x` in `[0, L]` sampled at 41 points. Return midspan value, max(|δ|) and position of max.

For partial UDLs, integrate via the Macaulay closed-form, or fall back to a strip-summation with 100 strips (acceptable given low call count).

## Acceptance criteria
- 6 m span, 200UB25.4 (`Ix ≈ 23.6e6 mm⁴`), full-span 10 kN/m UDL → mid-span δ ≈ 36 mm (matches `5wL⁴/384EI`).
- 6 m span, 100 kN point load at midspan → δ ≈ 33 mm (matches `PL³/48EI`).
- Pure point load away from midspan: result symmetric about midspan when mirrored.
- `npx tsc --noEmit` passes.
