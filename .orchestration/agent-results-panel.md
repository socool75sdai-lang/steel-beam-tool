# Agent: results-panel

**Wave:** 4
**Depends on:** Waves 1 + 2 + 3
**Output:** `src/components/ResultsPanel.tsx`

## Responsibility
Display live design results: PASS/FAIL banner, capacity table, BMD/SFD diagrams, deflection limit overrides, PDF export button.

## Component signature
```tsx
import { DesignInputs, CapacityResults, DiagramSet } from '@/types';

interface ResultsPanelProps {
  inputs: DesignInputs;
  results: CapacityResults | null;
  diagrams: DiagramSet | null;
  onDeflLimitsChange: (limits: { GQ: number; G: number }) => void;
}

export function ResultsPanel(props: ResultsPanelProps): JSX.Element;
```

## Implementation

### Layout
1. **PASS/FAIL banner** at top — green if `results.passes.overall`, red otherwise. Show overall section designation.
2. **Capacity check table** — 5 rows:
   - Section moment: demand `Mmax`, capacity `phiMs`, util `Mmax/phiMs`, status
   - Member moment: demand `Mmax`, capacity `phiMbx`, util `Mmax/phiMbx`, status
   - Shear: demand `Vmax`, capacity `phiVv`, util `Vmax/phiVv`, status
   - Deflection G+Q: demand `deflectionGQ` mm, limit `deflectionLimitGQ` mm, util, status
   - Deflection G: demand `deflectionG` mm, limit `deflectionLimitG` mm, util, status
   - Utilisation column: format as `(util*100).toFixed(1) + '%'`, highlight red if > 100%.
   - Status: green ✓ or red ✗.
3. **Deflection limit overrides** — two inputs: "G+Q limit: span / [300]", "G only limit: span / [360]" — call `onDeflLimitsChange` on change.
4. **Diagrams** — wrapped in a `<div ref={chartRef}>`:
   - BMD: Recharts `<LineChart>` with two `<Line>`s: factored (red) and serviceability (blue). X axis: x (m); Y axis: moment (kN·m). Invert Y axis (Recharts: `<YAxis reversed />`) so sagging moments display visually below the axis as is engineering convention.
   - SFD: Recharts `<LineChart>` with two `<Line>`s: factored (red) and serviceability (blue). X axis: x (m); Y axis: shear (kN).
   - Both use `<ResponsiveContainer width="100%" height={250}>`.
   - Add `<ReferenceLine y={0}` for axis baseline.
5. **PDF Export button** — calls `exportToPDF({ inputs, results, bmd, sfd, chartContainer: chartRef.current })`. Disabled when `results === null`.

### Empty state
If `results === null` or any required input is missing, render: "Enter valid inputs to see results."

## Styling
Tailwind: tables `border-collapse w-full`, status cell `text-center font-bold`. Banner full-width with `text-2xl font-bold p-4 rounded`.

## Acceptance criteria
- All five rows show correct numbers when results are provided.
- Both diagrams render.
- PDF export button is wired and triggers download.
- `npx tsc --noEmit` passes.
