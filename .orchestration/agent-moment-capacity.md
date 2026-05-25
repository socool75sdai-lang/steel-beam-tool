# Agent: section-capacity

**Wave:** 2
**Depends on:** Wave 1
**Output:** `src/engineering/as4100/momentCapacity.ts`

## Responsibility
AS4100 Section 5 — section classification, effective modulus, section moment capacity, member moment capacity (LTB).

## Constants
```ts
const E = 200_000;   // MPa
const G_MOD = 80_000; // MPa
const PHI = 0.9;
```

## Required exports
```ts
import { SteelSection, SectionClass } from '@/types';

export interface ClassificationResult {
  flangeLambda: number;
  webLambda: number;
  sectionClass: SectionClass;
  Ze: number;                // mm³
}

export function classifySection(section: SteelSection, fy: number): ClassificationResult;

export interface SectionCapacityResult {
  Ze: number;
  Msx: number;        // N·mm (Ze * fy)
  phiMs: number;      // kN·m
  sectionClass: SectionClass;
}

export function calcSectionCapacity(section: SteelSection, fy: number): SectionCapacityResult;

export interface MemberCapacityResult {
  Moa: number;        // N·mm
  alphaS: number;
  phiMbx: number;     // kN·m  (alphaM applied externally then capped)
}

export function calcMemberCapacity(
  section: SteelSection,
  fy: number,
  Le_mm: number,
  alphaM: number,
): MemberCapacityResult;
```

## Section classification (Cl. 5.2)
For an I-section:
- **Flange outstand:** `b = (bf - tw)/2`, slenderness `λf = (b/tf) · √(fy/250)`; limits `λep=9`, `λey=16`.
- **Web (in bending):** `d1 ≈ d − 2·tf` (clear web depth), slenderness `λw = (d1/tw) · √(fy/250)`; limits `λep=82`, `λey=115`.

For hollow sections (SHS/RHS):
- Use flat width `b = bf - 2·tf`, `λ = (b/tf)·√(fy/250)`, limits `λep=30`, `λey=40`.

For CHS:
- `λe = (d/t) · (fy/250)`, limits `λep=50`, `λey=120`.

For EA / PFC: treat conservatively as non-compact with `Ze = Zx`.

Section class = most critical element class (compact / non-compact / slender).

## Effective modulus `Ze` (Cl. 5.2.3)
- **Compact:** `Ze = min(Sx, 1.5·Zx)`
- **Non-compact:** for the critical element with slenderness `λ`, plastic/yield limits `λp, λy`:
  - `Ze = Zx + (Sx − Zx)·(λy − λ)/(λy − λp)`
- **Slender:** `Ze = Zx · (λy / λ)²`

## Section moment capacity
- `Msx = Ze * fy`  (N·mm)
- `phiMs = PHI * Msx / 1e6`  (kN·m)

## Member moment capacity — LTB (Cl. 5.6.1.1)
- `Moa = sqrt( (π²·E·Iy / Le²) · (G_MOD·J + π²·E·Iw / Le²) )`  (N·mm)
- `ratio = Msx / Moa`
- `αs = 0.6 · ( sqrt(ratio² + 3) − ratio )`
- `phiMbx = min(PHI · αm · αs · Msx, PHI · Msx) / 1e6`  (kN·m)

## Edge cases
- If `Le === 0` or `Iy === 0` or `Iw === 0` → treat as fully restrained: `Moa = Infinity`, `αs = 1.0`, `phiMbx = phiMs`.
- For hollow sections (closed) LTB rarely governs — still compute, but result will be near `phiMs`.

## Acceptance criteria
- `calcSectionCapacity(200UB25.4, 300)` returns `phiMs` in approximately `60–75 kN·m` range.
- Fully restrained beam (`Le → 0`): `phiMbx === phiMs`.
- Unrestrained 6 m: `αs < 1.0`, `phiMbx < phiMs`.
- `npx tsc --noEmit` passes.
