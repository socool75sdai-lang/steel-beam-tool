# Rev 6 — Handover Specification

**Date captured:** 2026-06-06
**Source:** Design interview (grill-me) with engineer. All decisions below are final and confirmed.
**For:** Planning agent — produce an orchestration plan, then implement. **Do not deviate** from the confirmed decisions without re-consulting the engineer.

---

## Context

Existing tool: browser-based AS4100/AS1170 steel design app (React 18 + TS + Vite, client-side only),
located at `steel-beam-tool/`. Two tabs today: **Steel Beam** and **Steel Column** (both always mounted,
CSS-hidden when inactive; state preserved on switch). McVeigh Consultants theme.

Rev 6 has **four items**:

| # | Item | Type | Touches |
|---|---|---|---|
| 1 | Top/bottom flange restraints in Steel Beam (separate the single intermediate-restraint field into two) | Engineering + UI | Beam |
| 2 | New **Steel Brace** tab — beam-column design per AS4100 | Large new feature | New tab |
| 3 | On-screen "Show calculations" collapsible added to **Steel Column** and **Steel Brace** | UI | Column + Brace |
| 4 | Grey helper text → cream/white on the dark green panels, all three tabs | CSS polish | All |

Reference images: `.Improvements/Rev 6/1.jpg` (restraints panel), `.Improvements/Rev 6/3.jpg`
(results summary line + show-calculations + grey text).

---

## Item 1 — Top / bottom flange intermediate restraints (Steel Beam)

### Problem
Today the Restraints panel (Advanced mode) has a single **"Number of intermediate restraints"** field.
It auto-computes evenly-spaced positions and `calcEffectiveLength` treats each intermediate point as a
**full restraint to the whole cross-section** (flange-agnostic). The engineer's concern: this behaves as
if both flanges are restrained at every point (like a haunch), which is not how real restraint works —
a gravity beam typically has many top-flange restraints (sheeting/purlins) and few bottom-flange
restraints (fly braces).

### Required behaviour (CONFIRMED)
Split the single field into **two count fields**, each replicating the *current* count-based,
auto-evenly-spaced behaviour, **independently**:
- **Top flange — number of intermediate restraints**
- **Bottom flange — number of intermediate restraints**

Both default to 0. Both live in **Advanced mode only**. **Simple mode is unchanged** (single Le/L
multiplier). No per-position entry table, no continuous-restraint checkbox (recorded as possible future
option, *not* in scope).

### LTB / effective-length logic (CONFIRMED — this is the engineering core)
- Only the **critical (compression) flange** restraints reduce the LTB segment length.
- Determine the **compression flange segment-by-segment from the BMD sign**:
  - **Sagging** region → **top** flange is in compression → **top-flange** restraints segment the beam there.
  - **Hogging** region (FF / PF support conditions, or net uplift) → **bottom** flange in compression →
    **bottom-flange** restraints govern there.
- For a plain PP sagging beam with no hogging, the **bottom-flange restraints have no effect** on `Le`
  (tension flange). Add a one-line note in the calc section stating this so it doesn't look like a bug.
- **Governing segment = the segment with the lowest φMbx (highest utilisation)** — NOT merely the longest
  segment. Compute φMbx for **each** compression-flange segment using that segment's own `Le` and its own
  αm (from that segment's BMD shape via `calcAlphaM`), then report the worst.
- Results must display the **governing segment's** `Le`, αm, αs, and its **start–end position** (which bay
  drives the check).

### Data model (CONFIRMED — no back-compat needed)
- In `RestraintConfig` (types/index.ts), **replace** `intermediate: number[]` with:
  - `intermediateTop: number[]`
  - `intermediateBottom: number[]`
- No legacy migration required — old exported JSON files were tests and will **not** be re-imported into
  the Rev 6 version. (Clean schema change; do not add a back-compat shim.)
- αm **override** stays a single global override applied to the governing segment (behaviour unchanged).

### Files likely touched
`types/index.ts`, `components/RestraintPanel.tsx`, `engineering/as4100/effectiveLength.ts`,
`engineering/evaluate.ts`, `components/ResultsPanel.tsx` (governing-segment display + note),
`utils/pdfExport.ts` (calc sheet), `App.tsx` (initial `RestraintConfig`).

---

## Item 2 — Steel Brace tab (new feature)

A new **Steel Brace** tab designing a **horizontal beam-column** per AS4100 (Cl. 6 buckling + Cl. 8.3/8.4
combined actions). Architecturally **very close to the existing Column tool** — reuse `columnCapacity.ts`,
`calcFyHollow`, the hollow grades, the section database, and the interaction-diagram chart wherever possible.

### Structural model (CONFIRMED)
- **Axial:** compression, buckling-governed (φNc about x and y). Entered as a **single ultimate
  (already-factored) value N\***, typed directly (no G/Q split, no eccentricity). The **same N\* is applied
  in every load combination** (the tool cannot apply 0.9G-type reductions to the axial part — accepted).
- **Bending:** **major (x) axis only**. M\* from self-weight (auto) + transverse point loads, factored per
  AS1170. No minor-axis / biaxial bending. M\*y = 0.
- **Check:** combined axial + major-axis bending via **AS4100 Cl. 8.3 (section) / Cl. 8.4 (member)** — the
  same engine the Column tool already uses for hollow sections.

### Loads (CONFIRMED)
- **Transverse point loads only** (no line/area loads), each tagged **G / Q / Wind**. Wind magnitude entered
  **signed** (positive = down, negative = up) to model uplift.
- **Self-weight:** auto-included as a vertical UDL (reuse `calcSelfWeightKnPerM`), part of the G action in
  both the bending combos and the deflection check. Shown as a read-only row like the beam.
- **Axial N\*** input lives in the **Load panel** with the other loads.
- **Live-load category dropdown** (same list the beam uses) added to the Load panel → drives **ψc** (and ψl
  if needed). Extend `engineering/as1170/psiFactors.ts` to provide ψc (short-term combination factor,
  AS1170.0 Table 4.1) alongside the existing ψl.

### Load combinations for bending M\* (CONFIRMED — take worst |M\*|)
1. `1.2G + 1.5Q`
2. `1.2G + Wu + ψc·Q`
3. `0.9G + Wu`   (uplift case)

(Self-weight is always in the G part.)

### Deflection check (CONFIRMED)
- Compute deflection from **self-weight only** (bare member sag).
- Limit **L/360**, exposed as a **user-editable field defaulting to 360** (same pattern as the beam's
  deflection-limit inputs).

### Effective length (CONFIRMED)
- **Factors `kx`, `ky`** (default 1.0) × span → `Le_x = kx·L`, `Le_y = ky·L` (mirrors the Column tool).
- φNc checked about **both** axes; governing = lower φNc. Use rx = √(Ix/Ag), ry = √(Iy/Ag).

### Sections & grades (CONFIRMED)
- Types: **CHS, SHS, RHS** only (reuse existing section database arrays).
- Grades: **C250 / C350 / C450** (AS1163, flat fy, no thickness reduction — reuse `calcFyHollow`).
- **Default on load: CHS, C350.**
- Closed sections ⇒ **no LTB** ⇒ φMbx = φMsx, φMby = φMsy (same as Column hollow handling).

### Auto-lightest button (CONFIRMED — DEVIATION from beam/column pattern)
- Placed under the section-size dropdown.
- **Searches the full matrix: {CHS, SHS, RHS} × {C250, C350, C450}** and selects the **global lightest
  passing section**, setting **type, grade AND size**. (Beam/column only search within the selected
  type — the brace intentionally searches across all three types and all grades.)

### Output graphs (CONFIRMED — all three, on screen + PDF)
1. **N–M interaction diagram** (primary) — design point (M\*, N\*) against section envelope (φNs / φMsx)
   and member envelope (φNc / φMbx); reuse the Column tool's Recharts chart.
2. **Bending moment diagram** (governing transverse combo).
3. **Deflection profile** (self-weight) with the **L/360** reference line.

### Results panel (CONFIRMED)
PASS/FAIL banner; check table (axial section φNs, axial member x & y φNc, bending φMs, combined section
Cl. 8.3.3, combined member in-plane Cl. 8.4.2 / out-of-plane Cl. 8.4.4, self-weight deflection); section-class
summary line; **"Show calculations" collapsible** (see Item 3); the three graphs; **Export PDF** button.

### PDF (brace)
3-page, **ASCII-only** (jsPDF helvetica cannot render Greek φ/λ/ψ — established convention, see column PDF):
page 1 inputs + check table; page 2 graphs (interaction + BMD + deflection); page 3 calc sheet with
AS-clause tags. Use shared `buildFilename(jobNumber, jobName, 'pdf')`; receive jobNumber/jobName from `App`
(same as Column).

### Tab placement (CONFIRMED)
Order: **Steel Beam | Steel Column | Steel Brace**. All three tabs **always mounted**, CSS-hidden when
inactive (extend the existing pattern in `App.tsx`).

### New files (suggested)
`types/brace.ts`, `engineering/as4100/braceCapacity.ts` (or reuse columnCapacity), `hooks/useBraceCalculations.ts`,
`components/BraceGeometryPanel.tsx`, `components/BraceLoadPanel.tsx`, `components/BraceResultsPanel.tsx`,
`BraceApp.tsx`, `utils/bracePdfExport.ts`. Wire the new tab into `App.tsx`.

---

## Item 3 — On-screen "Show calculations" collapsible for Column and Brace

### Required (CONFIRMED — parity with the beam)
Add the same **"Show calculations ▾"** collapsible the beam has (monospace block: formula → substituted
values → result, AS-clause tags, conditional sections) to **both** the Column and Brace results panels.

- **Column** already computes `ColumnIntermediates` but only surfaces them in its PDF calc sheet. Add the
  on-screen collapsible covering: section classification; axial section φNs; member buckling φNc (x & y, with
  λn / αc); bending φMs / φMb; combined Cl. 8.3.3 / 8.4.2 / 8.4.4.
- **Brace** collapsible covers: section classification; φNc (x & y); bending φMs (with the "no LTB — closed
  section" note); the 3 load combos → governing M\*; combined interaction (Cl. 8.3/8.4); self-weight
  deflection vs L/360.
- **Keep the existing Column PDF calc sheet**, and keep the on-screen collapsible text **consistent** with
  the PDF sheet content (column ends up with both; they should read identically).

---

## Item 4 — Grey helper text → cream/white on dark panels (all three tabs)

### Required (CONFIRMED — scoped, NOT literal everywhere)
The grey text the engineer flagged (`3.jpg`: the "Section class: compact · fy = … · Le = …" summary line,
the deflection-limit labels, panel-level captions) is `text-gray-500/600` sitting **on the dark green
McVeigh panel** — low contrast. Recolour it to **cream (`--mc-cream`)** for visual consistency (engineer
said "white"; cream chosen as the softer, theme-consistent shade and confirmed acceptable).

**Critical constraint — do NOT make white-on-white:**
- Only recolour grey text that sits **directly on the green panel background**.
- **Leave dark** all grey text on **white** backgrounds: the "Show calculations" box body/italic notes,
  results-table cells, and **Recharts** axis/legend/label text (`#333` on the white chart canvas).
- Scope the change to **`[data-theme="mcveigh"]`** so the **Light theme is unaffected** (grey on white stays).
- Apply consistently across **all three** tabs (beam, column, brace).

Files: primarily `index.css` (scoped rules) and the specific panel components where panel-level captions
carry `text-gray-*` classes.

---

## Suggested sequencing (for the planning agent)

Strictly sequential on `main` (consistent with Rev 2–5 precedent; no worktrees), each card gated with
`npx tsc --noEmit` + `npm run build` + Playwright MCP browser confirmation, committed before the next:

1. **6R0 — Item 4** (CSS only, zero risk).
2. **6R1 — Item 1** (beam restraints: types + effectiveLength per-segment loop + evaluate + RestraintPanel
   + ResultsPanel display + pdfExport calc sheet).
3. **6R2 — Item 3, Column collapsible** (no new computation; reads existing `ColumnIntermediates`).
4. **6R3 — Item 2, Brace engine + types** (types/brace, braceCapacity reusing columnCapacity, psiFactors ψc).
5. **6R4 — Item 2, Brace UI + hook** (geometry/load/results panels, BraceApp, tab wiring, three graphs,
   auto-select across full matrix). Includes the Brace's Item-3 collapsible.
6. **6R5 — Item 2, Brace PDF** (3-page ASCII, requires final `BraceResults` shape).
7. **6I1 — Integration QA** (all four items, browser + PDF evidence).

---

## Assumptions / open items (verify or flag, not yet decided by engineer)

- **JSON Save/Load remains beam-only.** The existing Export/Import serialises only the beam's `DesignInputs`
  (the Column tab's state is already excluded). The Brace is assumed likewise excluded. Flag to the engineer
  if cross-tab save/load is wanted.
- **ψc table values** to be taken from AS1170.0 Table 4.1; confirm the exact ψc per live-load category against
  the engineer's reference if any category is ambiguous.
- **Brace section properties:** confirm the existing CHS/SHS/RHS database rows carry everything needed
  (Ag, Ix, Iy, Sx, Zx, J) — Iw/LTB not needed (closed sections).
- **No new npm packages** (consistent with all prior revs).

---

## Verification gates (every card)

| Gate | Tool |
|---|---|
| Type check | `npx tsc --noEmit` → 0 errors |
| Build | `npm run build` → clean |
| Visual | Playwright MCP browser confirmation of the item's behaviour |
| PDF (where relevant) | generate and inspect the exported PDF |

### Item-specific spot-checks to include
- **Item 1:** a PP sagging beam — bottom-flange restraints must have **no** effect on `Le`; adding top-flange
  restraints must reduce `Le` and raise φMbx. An FF beam — bottom-flange restraints near the hogging ends
  **must** govern there. Confirm the governing segment reported is the lowest-φMbx one, not the longest.
- **Item 2:** a hand-calc beam-column spot-check (pick a CHS, known N\*, self-weight + one Q point load + one
  Wind uplift load) reproducing N\*, governing M\*, φNc x/y, the Cl. 8.3/8.4 ratios, and the L/360 deflection.
  Auto-lightest must return the global lightest across all three types and grades. All three graphs render.
- **Item 3:** Column and Brace collapsibles expand/collapse; substituted values match the results table and
  the PDF calc sheet.
- **Item 4:** McVeigh theme — panel summary lines render cream/legible; calc-box, table, and chart text stay
  dark/legible; Light theme unchanged.
