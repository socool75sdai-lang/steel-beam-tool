# Rev 3 Handover — Steel Beam Design Tool
**Date:** 2026-05-26  
**Status:** Requirements finalised — ready for implementation planning  
**Do not execute:** This document is a handover spec for a future planning agent.

---

## Overview

Five items. Two touch the engineering/types layer (items 1–2). Three are confined to `src/utils/pdfExport.ts` plus a new intermediate-values extension to `CapacityResults` (items 3–5).

---

## Item 1 — Deflection combination: G+Q → G+ψ_l·Q

### What
Change the serviceability deflection check from G+Q to G+ψ_l·Q (dead load + long-term live load factor × live load), per AS1170.1.

### Decisions
- **ψ_l table:** Full AS1170.1 Table 4.1 — all categories shown in the dropdown with factor value:
  | Category | ψ_l |
  |---|---|
  | Domestic / Residential | 0.4 |
  | Office | 0.4 |
  | Parking | 0.4 |
  | Retail / Commercial | 0.4 |
  | Storage | 0.6 |
  | Roof (other) | 0.0 |
- **Scope:** Single global selector — ψ_l applies to **all** Q loads uniformly.
- **UI location:** Top of the Load panel (section 2), above the point/line/area load tables.
- **Label:** Dynamic — shows the actual factor in every place the check is named. E.g. if ψ_l = 0.6: label becomes `"Deflection (G+0.6Q)"`. Applied in: results table, deflection chart legend, PDF check table, PDF calc sheet page 3.

### Files to change
| File | Change |
|---|---|
| `src/types/index.ts` | Add `LiveLoadType` union type and `psiL` field to `DesignInputs` |
| `src/engineering/as1170/psiFactors.ts` | **New file** — `LiveLoadType` → `ψ_l` lookup table and helper |
| `src/engineering/as4100/deflection.ts` | Accept `psiL: number` parameter; replace `qFactor = 1.0` with `qFactor = psiL` for the G+ψ_l·Q combo |
| `src/components/LoadPanel.tsx` | Add `liveLoadType` dropdown at top of panel; call `onChange({ liveLoadType })` |
| `src/components/ResultsPanel.tsx` | Update deflection check row label and chart legend to show `G+{psiL}Q` |
| `src/engineering/evaluate.ts` | Pass `psiL` through to `calcDeflection` / `calcDeflectionProfile` |
| `src/utils/pdfExport.ts` | Update deflection row label in check table and diagrams page |

### Type additions (`src/types/index.ts`)
```ts
export type LiveLoadType =
  | 'domestic'
  | 'office'
  | 'parking'
  | 'retail'
  | 'storage'
  | 'roof';

// Add to DesignInputs:
liveLoadType: LiveLoadType;
```

### New file: `src/engineering/as1170/psiFactors.ts`
```ts
import type { LiveLoadType } from '@/types';

export const PSI_L_FACTORS: Record<LiveLoadType, number> = {
  domestic: 0.4,
  office: 0.4,
  parking: 0.4,
  retail: 0.4,
  storage: 0.6,
  roof: 0.0,
};

export const LIVE_LOAD_LABELS: Record<LiveLoadType, string> = {
  domestic: 'Domestic / Residential',
  office: 'Office',
  parking: 'Parking',
  retail: 'Retail / Commercial',
  storage: 'Storage',
  roof: 'Roof (other)',
};

export function getPsiL(type: LiveLoadType): number {
  return PSI_L_FACTORS[type];
}
```

### Default value
`liveLoadType: 'office'` (ψ_l = 0.4) as the app default in `App.tsx` initial state.

---

## Item 2 — Point load position: metres → % of span

### What
Change the point load position input from an absolute distance (m) to a percentage of span (0–100%). 50% = midspan.

### Decisions
- **Storage:** `PointLoad.position` stores the raw percentage value (0–100). **All consumers** that read `.position` must convert to metres: `positionMetres = (position / 100) * span`.
- **No migration needed:** No localStorage or session persistence exists — state resets on page load.
- **Validation:** Out-of-range warning changes from `p.position < 0 || p.position > span` to `p.position < 0 || p.position > 100`.
- **Span-sync:** When span changes, percentage positions are inherently correct — no sync needed (unlike line/area load `end` fields).
- **PDF:** Point load listings in the PDF inputs section should print as `P: X kN @ 50% (G)` instead of `P: X kN @ 5.00 m (G)`.

### Files to change
| File | Change |
|---|---|
| `src/components/LoadPanel.tsx` | Change column header from "Position (m)" to "Position (% span)"; update validation; update placeholder to "% of span" |
| `src/engineering/as4100/deflection.ts` | In both `calcDeflection` and `calcDeflectionProfile`: convert `pl.position` → `(pl.position / 100) * inputs.span` before multiplying by 1000 to get mm |
| `src/engineering/as1170/loadCombinations.ts` | Same conversion wherever point load position is used for BMD/SFD |
| `src/utils/pdfExport.ts` | Print position as `${p.position.toFixed(0)}%` in the inputs load listing |

### Conversion pattern (to apply in all engineering consumers)
```ts
// Before:
a: pl.position * 1000,  // mm

// After:
a: (pl.position / 100) * inputs.span * 1000,  // mm
```

---

## Item 3 — PDF text overlap fix

### What
Fix two overlap problems visible in the current PDF export:
1. The restraint description string overflows the left column into the Section Properties column.
2. The Section Properties block (13 rows) runs past y=90mm, overlapping the Design Check Summary table header.

### Decision
Keep the two-column layout (Inputs left, Section Properties right). Move Diagrams to **page 2** — this gives the table and any future content room to breathe on page 1, and gives the calc summary page 3 its own page.

### PDF page structure (post-fix)
| Page | Content |
|---|---|
| 1 | Header, Inputs + Section Properties (two columns), Design Check Summary table |
| 2 | Diagrams (BMD, SFD, Deflection Profile) |
| 3+ | Running Calculation Sheet (Item 5) |

### Specific fixes in `src/utils/pdfExport.ts`
1. **Restraint line wrap:** Replace single `doc.text(...)` for the restraint string with `doc.splitTextToSize(restraintStr, 90)` and iterate lines with `y += lineH` per line. This keeps it within the ~95mm left column width.
2. **Table position:** Move `"Design Check Summary"` heading from y=90 to y=**115** (clear of both columns — left column capped at maxLoadY=85, right column 13×5mm ends at y=106).
3. **Table row y-values:** Shift `rowYs` down accordingly: `[121, 127, 133, 139, 145]`.
4. **Diagrams section:** Remove diagram drawing calls from page 1. Call `doc.addPage()` before drawing diagrams. Reset y-origin for diagrams to start at y=20 on page 2.

---

## Item 4 — PDF diagrams: enhanced jsPDF drawing

### What
Enhance the existing jsPDF diagram drawing routines to match the information content of the app's Recharts charts. No new dependencies (no html2canvas).

### Decisions
- Keep the existing `drawDiagram` and `drawDeflectionDiagram` functions in `pdfExport.ts`.
- **BMD chart additions:**
  - `φMs` reference line — horizontal dashed line at the φMs value, colour green (pass) or red (fail), labelled `φMs = X kN·m`
  - `φMbx` reference line — same treatment, labelled `φMbx = X kN·m`
- **SFD chart additions:**
  - `+φVv` reference line — positive side, labelled `φVv = X kN`
  - `−φVv` reference line — negative side, same colour coding
- **Deflection chart additions:**
  - Already has L/300 and L/360 lines — confirm these carry their label (currently only `L/300` is labelled; add `L/360` label too)
  - Colour-code both limit lines green/red by pass/fail (already partially done — verify both lines are coded)
- **No Y-axis tick labels** — retain the existing `max |field| = X` annotation at bottom-right only.
- **Line style:** Capacity reference lines drawn as dashed (alternate `doc.line` segments, step=2) to distinguish from the demand curve.

### Updated `drawDiagram` signature
```ts
function drawDiagram(
  doc: jsPDF,
  points: DiagramPoint[],
  field: 'moment' | 'shear',
  span: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  label: string,
  refLines: Array<{ value: number; label: string; pass: boolean }>,  // NEW
): void
```

### `PdfExportArgs` additions needed
The export function already receives `results: CapacityResults` which contains `phiMs`, `phiMbx`, `phiVv`, and `passes` — no additional arguments needed; reference line values are assembled inside `exportToPDF`.

---

## Item 5 — Running calculation sheet (PDF page 3+)

### What
A third PDF page (auto-overflowing to further pages if needed) showing the full structural calculation chain with intermediate values, formulae, substituted numbers, and AS clause references — a formal calc sheet format.

### Decisions
- **Format (Option A):** Each step shows: step name, formula string, substituted values, result, AS clause tag. E.g.:
  ```
  Flange slenderness  [AS4100 Cl. 5.2.2]
  λ_f = (bf / 2tf) × √(fy/250) = (190 / 2×14.5) × √(300/250) = 7.28
  Compact limit λ_ep = 9  →  λ_f ≤ λ_ep  →  Flange: Compact
  ```
- **CapacityResults extension:** Add an `intermediates` sub-object containing all values needed to render these steps. Engineering modules populate it; `pdfExport.ts` renders it.
- **Auto-overflow:** Track current y-position; call `doc.addPage()` and reset y when near the page bottom (y > 270mm).

### `CapacityResults` extension

Add to `src/types/index.ts`:

```ts
export interface DesignIntermediates {
  // Section properties used
  fy: number;                  // MPa
  // Section classification [AS4100 Cl. 5.2]
  flangeLambda: number;        // λ_f
  flangeEp: number;            // λ_ep (compact limit)
  flangeEy: number;            // λ_ey (yield limit)
  webLambda: number;           // λ_w
  webEp: number;
  webEy: number;
  sectionClass: SectionClass;
  // Effective section modulus [AS4100 Cl. 5.2]
  Ze: number;                  // mm³
  Msx: number;                 // N·mm — = Ze × fy
  // Section moment capacity [AS4100 Cl. 5.1]
  phiMs: number;               // kN·m — = 0.9 × Msx/1e6
  // Effective length [AS4100 Cl. 5.6.3]
  Le: number;                  // m
  // Member moment capacity — LTB [AS4100 Cl. 5.6]
  Moa: number;                 // N·mm — reference buckling moment
  alphaM: number;              // moment distribution factor
  alphaS: number;              // slenderness reduction factor
  phiMbx: number;              // kN·m
  // Shear capacity [AS4100 Cl. 5.11]
  Aw: number;                  // mm² — web shear area
  dOnTw: number;               // d/tw web slenderness ratio
  slenderLimit: number;        // 82√(250/fy)
  webSlender: boolean;
  Vv: number;                  // N — nominal shear capacity
  phiVv: number;               // kN
  // Load demands
  Mmax: number;                // kN·m — governing factored moment
  Vmax: number;                // kN — governing factored shear
  governingCombo: string;      // e.g. "1.2G+1.5Q"
  // Deflection [AS1170.1 Cl. 4 / AS4100 Cl. 1.5]
  psiL: number;                // ψ_l factor used
  liveLoadTypeLabel: string;   // e.g. "Storage"
  deflectionGpsiLQ: number;    // mm — G+ψ_l·Q deflection
  deflectionG: number;         // mm — G deflection
  deflectionLimitGpsiLQ: number; // mm — span / divisor
  deflectionLimitG: number;    // mm
}
```

Add `intermediates: DesignIntermediates` to `CapacityResults`.

### Calc sheet sequence (page 3)

Render in this order, one block per calculation step:

```
1. Material Properties                    [AS4100 Cl. 2.1]
   fy = 300 MPa  (tf = 14.5 mm ≤ 17 mm → Grade 300)

2. Section Classification — Flange        [AS4100 Cl. 5.2.2]
   λ_f = (bf − tw)/(2tf) × √(fy/250)
       = (190 − 9.1)/(2×14.5) × √(300/250) = 7.28
   Compact limit λ_ep = 9  →  7.28 ≤ 9  →  Compact ✓

3. Section Classification — Web           [AS4100 Cl. 5.2.2]
   λ_w = (d − 2tf)/tw × √(fy/250)
       = (457 − 29)/(9.1) × √(300/250) = 52.7
   Compact limit λ_ep = 82  →  52.7 ≤ 82  →  Compact ✓
   Overall section class: Compact

4. Effective Section Modulus              [AS4100 Cl. 5.2.3]
   Compact → Ze = min(Sx, 1.5×Zx)
            = min(1660e3, 1.5×1460e3) = 1,660,000 mm³

5. Section Moment Capacity                [AS4100 Cl. 5.1]
   φMs = φ × Ze × fy = 0.9 × 1,660,000 × 300 / 1e6 = 448.2 kN·m

6. Effective Length                       [AS4100 Cl. 5.6.3 / Table 5.6.3]
   Le = {mode summary} = X.XX m

7. Reference Buckling Moment              [AS4100 Cl. 5.6.1.1]
   Moa = π/Le × √(EIy × (GJ + π²EIw/Le²))
       = ... = XXXX kN·m

8. Member Slenderness Reduction           [AS4100 Cl. 5.6.1]
   αm = X.XX  (moment distribution factor)
   αs = 0.6 × (√((Msx/Moa)² + 3) − Msx/Moa) = X.XX

9. Member Moment Capacity                 [AS4100 Cl. 5.6]
   φMbx = min(φ×αm×αs×Msx, φMs)
        = min(0.9 × X.XX × X.XX × XXXX, 448.2) = XXX.X kN·m

10. Shear Capacity                        [AS4100 Cl. 5.11.4]
    Aw = d × tw = 457 × 9.1 = 4,159 mm²
    d/tw = 50.2  ≤  82√(250/300) = 74.9  →  No web slenderness reduction
    φVv = 0.9 × 0.6 × fy × Aw / 1000 = XXX.X kN

11. Load Combinations                     [AS1170.0 Cl. 4.2.2]
    ULS governing: 1.2G + 1.5Q  →  Mmax = XXX.X kN·m, Vmax = XXX.X kN
    SLS combo:     G + ψ_l×Q (ψ_l = 0.6, Storage)

12. Deflection Check — G+ψ_l·Q           [AS1170.1 Cl. 4 / AS4100 Cl. 1.5.3]
    Live load type: Storage  →  ψ_l = 0.6
    δ(G+ψ_l·Q) = XX.X mm  ≤  L/200 = XX.X mm  →  PASS ✓

13. Deflection Check — G only             [AS4100 Cl. 1.5.3]
    δ(G) = XX.X mm  ≤  L/360 = XX.X mm  →  PASS ✓
```

### Rendering notes for `pdfExport.ts`
- Font: 9pt normal for body; 9pt bold for step headings.
- Indent formula lines by 4mm; indent result lines by 4mm.
- After each step, draw a thin separator line.
- Track `y` cursor; when `y > 270`, call `doc.addPage()` and reset `y = 20`.
- Page header on each overflow page: small "McVeigh Steel Designer — Calculation Sheet (cont.)" line.

---

## Affected files summary

| File | Items | Nature of change |
|---|---|---|
| `src/types/index.ts` | 1, 5 | Add `LiveLoadType`, extend `DesignInputs` with `liveLoadType`, add `DesignIntermediates`, extend `CapacityResults` |
| `src/engineering/as1170/psiFactors.ts` | 1 | **New file** |
| `src/engineering/as1170/loadCombinations.ts` | 2 | Point load position conversion (% → m) |
| `src/engineering/as4100/deflection.ts` | 1, 2 | Accept `psiL` param; point load position conversion |
| `src/engineering/as4100/momentCapacity.ts` | 5 | Return `flangeLambda`, `flangeEp`, `flangeEy`, `webLambda`, `webEp`, `webEy`, `Moa` in results |
| `src/engineering/as4100/shearCapacity.ts` | 5 | Return `dOnTw`, `slenderLimit` in `ShearResult` |
| `src/engineering/evaluate.ts` | 1, 5 | Pass `psiL` to deflection; assemble `intermediates` block |
| `src/components/LoadPanel.tsx` | 1, 2 | Add `liveLoadType` dropdown; change point load position label/validation |
| `src/components/ResultsPanel.tsx` | 1 | Dynamic deflection label `G+{psiL}Q` in table and chart legend |
| `src/utils/pdfExport.ts` | 3, 4, 5 | Fix overlaps; move diagrams to page 2; enhance diagram drawing; add page 3 calc sheet |
| `src/App.tsx` | 1 | Add `liveLoadType: 'office'` to initial state |

---

## Verification gates (for the implementing agent)

1. `npx tsc --noEmit` — 0 errors
2. `npm run build` — clean build
3. Browser: Live load type dropdown visible at top of Load panel; changing to "Storage" updates the results table label to "Deflection (G+0.6Q)"
4. Browser: Point load position input accepts 0–100; "50" on a 10m span produces midspan deflection identical to the old "5m" input
5. Browser: Export PDF — page 1 has no text overlap; page 2 has diagrams with reference lines; page 3 has calc sheet
6. PDF: BMD chart has φMs and φMbx reference lines; SFD has ±φVv lines; deflection has both limit lines labelled
7. PDF: Calc sheet shows intermediate values with AS clause tags; overflows to page 4 correctly if content is long

---

## Out of scope (not in this rev)

- ResultsPanel deflection-limit inputs (span/300, span/360) leading-zero fix — excluded from Rev 2 scope, still outstanding but not in this rev.
- Any changes to line/area load position inputs (start/end remain in metres).
