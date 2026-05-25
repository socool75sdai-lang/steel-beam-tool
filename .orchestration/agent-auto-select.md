# Agent: auto-select

**Wave:** 3
**Depends on:** Waves 1 + 2
**Output:** `src/engineering/sections/autoSelect.ts`

## Responsibility
Find the lightest section of a given type that passes all design checks for the supplied inputs.

## Required export
```ts
import { DesignInputs, SectionType, SteelSection, CapacityResults } from '@/types';

export interface AutoSelectResult {
  section: SteelSection;
  results: CapacityResults;
}

/**
 * Returns the lightest passing section, or null if none pass.
 * Iterates sections of `type` sorted ascending by mass.
 */
export function autoSelectSection(
  inputs: DesignInputs,
  type: SectionType,
): AutoSelectResult | null;
```

## Algorithm
1. `sections = getSectionsByType(type)` (already ascending by mass).
2. For each candidate `section`:
   a. Build `candidateInputs = { ...inputs, section }`.
   b. Run full evaluation (use the same composition the React hook uses — extract a pure helper if needed):
      - Combine loads + analyse beam for the strength combo → `Mmax`, `Vmax`.
      - Compute `Le`, `αm`.
      - Compute `phiMs`, `phiMbx`, `phiVv`.
      - Compute deflections for G+Q and G.
      - Apply user-supplied deflection limits.
   c. If `passes.overall === true`, return `{ section, results }`.
3. If no section passes, return `null`.

## Implementation note
To avoid circular dependencies with the hook, expose a pure `evaluateDesign(inputs): CapacityResults` helper in this file or in a shared `src/engineering/evaluate.ts` module. Both `autoSelect` and the `useDesignCalculations` hook should import from the same evaluation function.

**Recommended:** create `src/engineering/evaluate.ts` exposing `evaluateDesign(inputs): { results, diagrams }`. Both autoSelect and the hook use it.

## Acceptance criteria
- For trivial inputs (1 m span, 1 kN load), returns the smallest section in the type.
- For aggressive inputs (10 m span, 50 kN/m UDL), returns a heavy section or `null`.
- Iteration short-circuits at first passing match (does not evaluate every section).
- `npx tsc --noEmit` passes.
