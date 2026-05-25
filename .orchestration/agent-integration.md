# Agent: app-integration

**Wave:** 5
**Depends on:** All Wave 4
**Outputs:**
- `src/App.tsx`
- `src/hooks/useDesignCalculations.ts`
- `src/engineering/evaluate.ts` (if not already created by autoSelect)

## Responsibility
Wire all components together with state management, the live recalculation hook, and the split layout.

## App.tsx state
```ts
const [inputs, setInputs] = useState<DesignInputs>(initialInputs());
const { results, diagrams } = useDesignCalculations(inputs);

const handleChange = (patch: Partial<DesignInputs>) =>
  setInputs(prev => ({ ...prev, ...patch }));

const handleDeflLimits = (deflLimits: DeflLimits) =>
  setInputs(prev => ({ ...prev, deflLimits }));
```

### initialInputs()
```ts
{
  span: 6,
  tributaryWidth: 3,
  section: getDefaultSection(),
  loads: { point: [], line: [], area: [] },
  restraint: {
    mode: 'simple',
    simpleType: 'FF',
    leMultiplier: 1.0,
    endA: 'F', endB: 'F',
    intermediate: [],
    alphaMOverride: null,
  },
  deflLimits: { GQ: 300, G: 360 },
}
```

## useDesignCalculations hook
```ts
import { useMemo } from 'react';
import { evaluateDesign } from '@/engineering/evaluate';
import { DesignInputs, CapacityResults, DiagramSet } from '@/types';

export function useDesignCalculations(inputs: DesignInputs): {
  results: CapacityResults | null;
  diagrams: DiagramSet | null;
} {
  return useMemo(() => {
    try {
      return evaluateDesign(inputs);
    } catch (e) {
      console.error('Design evaluation error:', e);
      return { results: null, diagrams: null };
    }
  }, [inputs]);
}
```

## evaluate.ts (pure)
```ts
export function evaluateDesign(inputs: DesignInputs): { results: CapacityResults; diagrams: DiagramSet };
```
Order of computation:
1. `analyseBeam(inputs, COMBOS[0])` → `{ bmd, sfd, Mmax, Vmax }` (factored)
2. `analyseBeam(inputs, COMBOS[1])` (serviceability)
3. `analyseBeam(inputs, COMBOS[2])` (dead only)
4. `Le = calcEffectiveLength(span, restraint)`
5. `αm = restraint.alphaMOverride ?? calcAlphaM(bmd_factored, 0, span)`
6. `fy = calcFy(section)`
7. `{ Ze, phiMs, sectionClass } = calcSectionCapacity(section, fy)`
8. `{ phiMbx, alphaS, Moa } = calcMemberCapacity(section, fy, Le*1000, αm)`
9. `{ phiVv } = calcShearCapacity(section, fy)`
10. `deflectionGQ = calcDeflection(inputs, 'G+Q').max`
11. `deflectionG  = calcDeflection(inputs, 'G').max`
12. Compute deflection limits in mm: `deflectionLimitGQ = span*1000/deflLimits.GQ`, `deflectionLimitG = span*1000/deflLimits.G`.
13. Compute `passes`:
    - `sectionMoment`: `Mmax_factored ≤ phiMs`
    - `memberMoment`: `Mmax_factored ≤ phiMbx`
    - `shear`: `Vmax_factored ≤ phiVv`
    - `deflectionGQ`: `δ_GQ ≤ limit_GQ`
    - `deflectionG`: `δ_G ≤ limit_G`
    - `overall`: all above true
14. Return `{ results, diagrams: { factored, serviceability, dead } }`.

## App.tsx layout
```tsx
<div className="flex h-screen overflow-hidden bg-gray-50">
  <div className="w-2/5 overflow-y-auto p-4 border-r border-gray-300">
    <h1 className="text-xl font-bold mb-4">Steel Beam Design Tool</h1>
    <GeometryPanel inputs={inputs} onChange={handleChange} />
    <LoadPanel inputs={inputs} onChange={handleChange} />
    <RestraintPanel inputs={inputs} onChange={handleChange} />
  </div>
  <div className="w-3/5 overflow-y-auto p-4">
    <ResultsPanel
      inputs={inputs}
      results={results}
      diagrams={diagrams}
      onDeflLimitsChange={handleDeflLimits}
    />
  </div>
</div>
```

## Error boundary
Wrap `<ResultsPanel>` in a small ErrorBoundary so calculation failures show a friendly message instead of crashing the app.

## Acceptance criteria
- `npm run dev` boots, page renders.
- Editing span updates results live without page reload.
- Changing section updates capacities.
- Adding a point load updates BMD/SFD.
- PDF export works.
- `npx tsc --noEmit` passes.
- `npm run build` succeeds.
