# Agent: pdf-export

**Wave:** 3
**Depends on:** Wave 1
**Output:** `src/utils/pdfExport.ts`

## Responsibility
Generate a single-page A4 PDF report summarising inputs, design checks, and BMD/SFD diagrams.

## Required export
```ts
import { DesignInputs, CapacityResults, DiagramPoint } from '@/types';

export interface PdfExportArgs {
  inputs: DesignInputs;
  results: CapacityResults;
  bmd: DiagramPoint[];        // factored
  sfd: DiagramPoint[];        // factored
  chartContainer?: HTMLElement | null;  // optional DOM node holding the rendered charts
}

export async function exportToPDF(args: PdfExportArgs): Promise<void>;
```

## Implementation
Use `jspdf` (no autotable). For charts, use `html2canvas` against the chart container ref passed from the React layer.

Layout (A4 portrait, 210×297 mm, 10 mm margins):

1. **Header (top)**
   - Title: "Steel Beam Design Report"
   - Date (today), section designation, span
   - PASS / FAIL banner: green if `results.passes.overall === true`, red otherwise
2. **Inputs summary** (left column)
   - Geometry: span (m), tributary width (m), section, restraint summary
   - Loads list (point/line/area with magnitudes, positions, G/Q)
3. **Section properties** (right column)
   - Mass, d, bf, tf, tw, Ix, Sx, Zx, Iy, J, Iw, fy
4. **Capacity check table** (full width below)
   - Columns: Check / Demand / Capacity / Utilisation / Status
   - Rows: Section moment (φMs), Member moment (φMbx), Shear (φVv), Deflection G+Q, Deflection G
   - Utilisation = demand/capacity (or actual/limit for deflection); highlight red if `> 1.0`
5. **Diagrams** (bottom half)
   - If `chartContainer` provided, `html2canvas(chartContainer)` and embed as image
   - Otherwise, render a simple SVG-style BMD/SFD via jsPDF line primitives from the DiagramPoint arrays

## Acceptance criteria
- Calling `exportToPDF` from a click handler triggers a PDF download named `steel-beam-design-{date}.pdf`.
- All 5 capacity rows present in the table.
- Utilisations > 100% are visually highlighted.
- `npx tsc --noEmit` passes.
