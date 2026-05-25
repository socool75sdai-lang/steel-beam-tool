# Agent: section-database

**Wave:** 1
**Depends on:** Wave 0 (does not depend on types — emits its own typed data)
**Outputs:**
- `src/engineering/sections/sectionDatabase.ts`
- `src/engineering/sections/sectionUtils.ts`

## Responsibility
Hardcode the InfraBuild standard section catalogue (Grade 300) and provide lookup utilities.

## Data structure
```ts
import { SteelSection, SectionType } from '@/types';

export const SECTION_DATABASE: Record<SectionType, SteelSection[]> = {
  UB:  [...],
  UC:  [...],
  PFC: [...],
  EA:  [...],
  SHS: [...],
  RHS: [...],
  CHS: [...],
};
```

Each array sorted **ascending by `mass_kg_m`**.

## Minimum coverage

| Type | Sizes (range, count) |
|------|----------------------|
| UB   | 150UB14.0 → 610UB125 (~25 sizes) |
| UC   | 100UC14.8 → 310UC158 (~14 sizes) |
| PFC  | 75PFC → 380PFC (~10 sizes) |
| EA   | 50×50×3 → 200×200×16 (~12 sizes) |
| SHS  | 50×50×3 → 250×250×9 (~10 sizes) |
| RHS  | 75×50×3 → 300×200×10 (~10 sizes) |
| CHS  | 48.3×3.2 → 323.9×9.5 (~10 sizes) |

## Required properties per section
All properties from `SteelSection` interface — particularly `Iy`, `J`, `Iw` (essential for LTB calculations). Use published InfraBuild values; cite source in a top-of-file comment.

For asymmetric sections (PFC, EA), `bf` represents the section's b-dimension and `tf` represents flange thickness; for hollow sections, set `bf = d` for SHS/RHS sensibly, and `tf = tw` (wall thickness). For CHS, `d = OD`, `bf = OD`, `tf = tw = wall thickness`.

For hollow sections, set `Iw ≈ 0` (warping is negligible — LTB does not govern).

## sectionUtils.ts exports
```ts
export function getSectionsByType(type: SectionType): SteelSection[];
export function getSectionByDesignation(designation: string): SteelSection | undefined;
export function getDefaultSection(): SteelSection;        // returns first UB
export function getAllSectionTypes(): SectionType[];      // returns ['UB','UC',...]
export function calcSelfWeightKnPerM(section: SteelSection): number;  // mass_kg_m * 9.81 / 1000
export function calcFy(section: SteelSection): number;    // 300 if tf <= 17, else 280
```

## Acceptance criteria
- `getSectionsByType('UB').length >= 20`
- All sections have positive `Ix`, `Iy`, `J`, `Sx`, `Zx`, `mass_kg_m`
- `getDefaultSection().type === 'UB'`
- `npx tsc --noEmit` passes
