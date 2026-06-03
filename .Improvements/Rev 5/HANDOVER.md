# Rev 5 Handover — McVeigh Steel Designer

**Date:** 2026-06-03  
**Prepared by:** Design interview with engineer + codebase audit  
**Status:** Ready for planning agent → orchestration plan

---

## Summary of items

| # | Item | Scope |
|---|---|---|
| 1 | White-on-white text fix (McVeigh theme) | CSS + component patch |
| 2 | Tab navigation — add Steel Column tab | App.tsx restructure |
| 3 | PDF BMD orientation — currently upside-down | pdfExport.ts one-liner |
| 4 | Steel Column design tool (AS4100) | New tool — largest item |

Items 1–3 are targeted patches. Item 4 is a full new feature that requires new files across types, engineering, components, hooks, and PDF export.

---

## Item 1 — White-on-white text (McVeigh theme)

### Problem
In the McVeigh theme (`data-theme="mcveigh"`), `.mc-panel` sets `color: var(--mc-cream)` (#F5F0E8) on all panel children. Any child element that has a **white background but no explicit text colour** becomes unreadable — light cream text on white.

Known locations (confirmed from reference image `1.jpg` and codebase):
1. **Restraints panel — Simple/Advanced toggle:** inactive button has `bg-white` but no text colour class (`RestraintPanel.tsx` line 65–71).
2. **Results panel — Recharts chart titles / axis tick labels / legend text:** Recharts SVG `<text>` elements inherit fill from CSS `color`; they appear cream on the white chart canvas.

### Fix approach
**Two-part fix:**

**Part A — CSS rule in `src/index.css`:**
Add a rule targeting Recharts SVG text elements within the McVeigh theme so they render in dark ink:
```css
[data-theme="mcveigh"] .recharts-cartesian-axis-tick-value,
[data-theme="mcveigh"] .recharts-legend-item-text,
[data-theme="mcveigh"] .recharts-label,
[data-theme="mcveigh"] .recharts-text {
  fill: #333333 !important;
}
```

**Part B — Component patch in `RestraintPanel.tsx`:**
Change the inactive button class from `'bg-white'` to `'bg-white text-gray-800'` (line 66):
```tsx
r.mode === mode ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'
```

**Implementer note:** Before committing, open the app in the McVeigh theme and visually audit all panels for any other white-background elements lacking explicit text colour. If found, apply `text-gray-800` inline or via a targeted CSS rule. Do not use a blanket override that could break other themed elements.

### Files touched
- `src/index.css`
- `src/components/RestraintPanel.tsx`

---

## Item 2 — Tab navigation (Steel Beam / Steel Column)

### Requirement
Add a "Steel Column" tab beside the existing "Steel Beam" tab in the nav bar (reference image `2.jpg`). Switching tabs shows the corresponding tool. Both tabs preserve their independent state — switching away and back does not reset inputs.

### Architecture
- `App.tsx` gains an `activeTab: 'beam' | 'column'` state (default `'beam'`).
- The existing beam UI (GeometryPanel, LoadPanel, RestraintPanel, ResultsPanel) moves into a `<BeamTab>` sub-component or remains inline under a `activeTab === 'beam'` guard.
- A new `<ColumnTab>` component (wrapping all column UI — see Item 4) renders under `activeTab === 'column'`.
- Both components are **always mounted** (use CSS `display: none` / Tailwind `hidden` class to hide the inactive one) so state is preserved via React's normal component lifecycle. Do **not** conditionally unmount.
- The nav bar renders two buttons using the existing `Steel Beam` button style; the active tab gets the gold underline, the inactive tab does not.

### Nav bar change (App.tsx ~line 124–134)
```tsx
<nav style={{ ... }}>
  {(['beam', 'column'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={activeTab === tab
        ? { color: 'var(--mc-gold)', borderBottom: '2px solid var(--mc-gold)' }
        : { color: 'var(--mc-gold-light)' }}
      className="px-4 py-2 text-sm font-medium -mb-px"
    >
      {tab === 'beam' ? 'Steel Beam' : 'Steel Column'}
    </button>
  ))}
</nav>
```

### Files touched
- `src/App.tsx` — add `activeTab` state, nav change, mount both tabs
- `src/ColumnApp.tsx` — new file (column tool wrapper; see Item 4)

---

## Item 3 — PDF BMD orientation

### Problem
The bending moment diagram in the exported PDF (`pdfExport.ts → drawDiagram`) plots positive moment values **upward** (toward the top of the page). The main app's Recharts BMD shows positive sagging moments in the structurally conventional orientation. The PDF is therefore upside-down relative to the screen.

### Fix
In `drawDiagram` (`pdfExport.ts` ~line 93 and 97), the Y coordinate for demand curve points is:
```js
const y = originY + height / 2 - (points[i][field] / scaleMax) * yScale;
```
The minus sign maps positive values upward. Change to **plus** so positive moment maps downward (sagging convention):
```js
const y = originY + height / 2 + (points[i][field] / scaleMax) * yScale;
```
Apply the same sign change to the `prevY` initialisation (line ~93) and to the loop body (line ~97).

**Note:** This fix applies to the moment diagram only. The SFD already renders correctly (shear sign convention is symmetric — both positive and negative values appear). Confirm the SFD still looks correct after the change. The `drawDeflectionDiagram` function is unaffected (it uses a separate baseline-at-top approach).

### Verification
After fix: export a PDF for a simply-supported beam with a midspan point load. Page 2 BMD should show the curve **below** the baseline (peak pointing down), matching the on-screen Recharts chart.

### Files touched
- `src/utils/pdfExport.ts`

---

## Item 4 — Steel Column design tool (AS4100)

### Overview
A fully self-contained column design tool in a new tab. Same visual language as the beam tool (McVeigh theme, split 2/5 inputs + 3/5 results layout). Shares the section database and some engineering utilities but uses its own types, calculation engine, components, and PDF export.

---

### 4.1 Inputs

#### Geometry panel
| Field | Type | Notes |
|---|---|---|
| Height (m) | number | Physical column height L; equivalent of beam's "span" |
| Section type | dropdown | UC, SHS, RHS, CHS only (no UB, WB, PFC, EA) |
| Steel grade | dropdown | UC → Grade 300 / Grade 350 (AS3678, same fy logic as beam); SHS/RHS/CHS → Grade 250 / Grade 350 / Grade 450 (AS1163 — flat fy, no thickness reduction) |
| Section size | dropdown | Filtered by type; sorted ascending by mass |
| Auto-select lightest | button | Same feedback pattern as beam tool |
| k_x | number | Effective length factor, x-axis buckling; default 1.0 |
| k_y | number | Effective length factor, y-axis buckling; default 1.0 |

**Derived:** `Le_x = k_x × L`, `Le_y = k_y × L` (displayed read-only, in metres).

#### Load panel
| Field | Type | Notes |
|---|---|---|
| G (kN) | number | Unfactored dead load axial force |
| Q (kN) | number | Unfactored live load axial force |
| e_x (mm) | number | Eccentricity in x-direction (causes bending about y-axis); default 0 |
| e_y (mm) | number | Eccentricity in y-direction (causes bending about x-axis); default 0 |

**AS1170 load factors (applied automatically):**
- `N* = max(1.2G + 1.5Q, G)` — governing factored axial load (kN)
- `M*x = N* × e_y / 1000` — factored moment about x-axis (kN·m; e_y in mm)
- `M*y = N* × e_x / 1000` — factored moment about y-axis (kN·m; e_x in mm)

Serviceability axial: `N_serv = G + Q` (displayed informally; no separate serviceability check for columns).

---

### 4.2 Steel grades for hollow sections

Per AS1163 (cold-formed hollow sections), fy is **constant regardless of thickness**:

| Grade | fy (MPa) |
|---|---|
| C250 (Grade 250) | 250 |
| C350 (Grade 350) | 350 |
| C450 (Grade 450) | 450 |

UC sections continue to use the existing `calcFy(section, grade)` logic from `sectionUtils.ts` (fy depends on tf per AS3678). Implement a new `calcFyHollow(grade)` helper (or extend `calcFy` with a branch) that returns flat fy for SHS/RHS/CHS.

---

### 4.3 Engineering checks (AS4100)

All checks use `φ = 0.9`.

#### 4.3.1 Section classification
Use the existing `momentCapacity.ts` classification logic. For hollow sections (SHS/RHS/CHS), section class is always compact (they rarely exceed the compact slenderness limit at practical sizes and these grades).

#### 4.3.2 Axial section capacity — Cl. 6.2
```
φNs = 0.9 × kf × Ag × fy    (kN)
kf = 1.0  (conservative; Aeff = Ag)
```

#### 4.3.3 Axial member capacity — Cl. 6.3
Compute independently for each axis:
```
r_x = √(Ix / Ag),  r_y = √(Iy / Ag)   (mm)
λn_x = (Le_x / r_x) × √(kf × fy / 250)
λn_y = (Le_y / r_y) × √(kf × fy / 250)
αc_x = calcAlphaC(λn_x)   [reuse existing function from compressionCapacity.ts]
αc_y = calcAlphaC(λn_y)
φNc_x = 0.9 × αc_x × kf × Ag × fy  (kN)
φNc_y = 0.9 × αc_y × kf × Ag × fy  (kN)
φNc   = min(φNc_x, φNc_y)            (governing member compression capacity)
```

#### 4.3.4 Bending section capacity — Cl. 5.2
```
φMsx = 0.9 × Ze_x × fy / 1e6   (kN·m)
φMsy = 0.9 × Ze_y × fy / 1e6   (kN·m)
Ze_x, Ze_y derived from section classification (reuse momentCapacity.ts logic)
For SHS/CHS: Ix = Iy → Ze_x = Ze_y
```

#### 4.3.5 Bending member capacity (LTB) — Cl. 5.6
- **SHS / RHS / CHS:** No LTB susceptibility (closed sections). `φMbx = φMsx`, `φMby = φMsy`.
- **UC:** Apply LTB check using `Le_x` as the LTB effective length (same as beam tool's existing `momentCapacity.ts` Moa calculation). `φMbx` from LTB reduction; `φMby = φMsy` (weak-axis bending, no LTB).

#### 4.3.6 Combined actions — Section Cl. 8.3.3
```
ratio_section = N*/φNs + M*x/φMsx + M*y/φMsy  ≤  1.0
```

#### 4.3.7 Combined actions — Member (in-plane) Cl. 8.4.2
```
ratio_member_inplane = N*/φNc + M*x/φMsx  ≤  1.0
```
(Conservative linear form; adequate for column design without moment amplification.)

#### 4.3.8 Combined actions — Member (out-of-plane) Cl. 8.4.4
```
ratio_member_outofplane = N*/φNc + M*x/φMbx  ≤  1.0
```
For hollow sections φMbx = φMsx so this equals the in-plane check.

#### 4.3.9 Governing check
```
overall PASS = all of:
  N*/φNs ≤ 1
  N*/φNc_x ≤ 1
  N*/φNc_y ≤ 1
  M*x/φMsx ≤ 1  (if M*x > 0)
  M*y/φMsy ≤ 1  (if M*y > 0)
  ratio_section ≤ 1
  ratio_member_inplane ≤ 1
  ratio_member_outofplane ≤ 1
```

---

### 4.4 Output — Results panel

#### Capacity check table
| Check | Demand | Capacity | Util | Status |
|---|---|---|---|---|
| Axial — Section (φNs) | N* kN | φNs kN | % | PASS/FAIL |
| Axial — Member x (φNc_x) | N* kN | φNc_x kN | % | PASS/FAIL |
| Axial — Member y (φNc_y) | N* kN | φNc_y kN | % | PASS/FAIL |
| Bending x — Section (φMsx) | M*x kN·m | φMsx kN·m | % | PASS/FAIL (hidden if M*x = 0) |
| Bending y — Section (φMsy) | M*y kN·m | φMsy kN·m | % | PASS/FAIL (hidden if M*y = 0) |
| Combined — Section (Cl. 8.3.3) | ratio | ≤ 1.00 | % | PASS/FAIL |
| Combined — Member in-plane (Cl. 8.4.2) | ratio | ≤ 1.00 | % | PASS/FAIL |
| Combined — Member out-of-plane (Cl. 8.4.4) | ratio | ≤ 1.00 | % | PASS/FAIL |

Summary line below table: `Section class: {x} · fy = {y} MPa · Le_x = {z} m · Le_y = {z} m`

#### N*–M* interaction diagram
Plot for the **governing axis** (x-axis if M*x ≥ M*y, else y-axis). Two capacity curves + design point:

- **Section envelope (straight line):** from (M*=φMs_gov, N*=0) to (M*=0, N*=φNs)
  `N*/φNs + M*/φMs_gov = 1`
- **Member envelope (straight line):** from (M*=φMb_gov, N*=0) to (M*=0, N*=φNc)
  `N*/φNc + M*/φMb_gov = 1`
- **Design point:** marked with a dot/cross at (M*_gov, N*)

Axes: X = moment (kN·m), Y = axial force (kN). Both capacity lines are green if design point is inside, red if outside. Title shows governing axis ("N*–M*x Interaction" or "N*–M*y Interaction").

Use Recharts `LineChart` (consistent with beam tool).

---

### 4.5 Auto-select lightest

Same logic as beam:
- Iterate ascending by mass within the selected section type and grade.
- Find the first section where all eight checks pass.
- Display message below the button (green = found / already lightest; red = none found).
- On selection, update `inputs.section`.

---

### 4.6 PDF export — 3-page layout

**Page 1 — Inputs + properties + check table**
- Job block (Job No, Job Name, date) — same format as beam page 1
- Design inputs: height, section designation, grade, fy, k_x, k_y, Le_x, Le_y, G, Q, N*, e_x, e_y, M*x, M*y
- Section properties: Ag, Ix, Iy, rx, ry, (J, Iw for UC)
- Capacity check table (same rows as UI table above)

**Page 2 — Interaction diagram**
- N*–M* interaction diagram for the governing axis
- Draw section envelope, member envelope, and design point using jsPDF line drawing (same approach as beam's `drawDiagram`; no external charting library in PDF)
- Title: "N*–M*x Interaction Diagram (AS4100)" or y-axis equivalent
- Axis labels: "M* (kN·m)", "N* (kN)"

**Page 3 — Calculation sheet**
Numbered steps with substituted values and AS clause tags. Minimum steps:
1. Steel grade and fy `[AS3678 / AS1163]`
2. Section classification (flanges, web/wall) `[AS4100 Cl. 5.2.2]`
3. Ze_x, Ze_y `[AS4100 Cl. 5.2.3–5.2.5]`
4. φMsx, φMsy `[AS4100 Cl. 5.2.1]`
5. LTB check for UC (Moa, αs, φMbx) or "No LTB — closed section" `[AS4100 Cl. 5.6]`
6. Factored loads N*, M*x, M*y `[AS1170.1]`
7. kf, φNs `[AS4100 Cl. 6.2.1–6.2.2]`
8. λn_x, αc_x, φNc_x `[AS4100 Cl. 6.3.3]`
9. λn_y, αc_y, φNc_y `[AS4100 Cl. 6.3.3]`
10. Combined — section Cl. 8.3.3 `[AS4100 Cl. 8.3.3]`
11. Combined — member in-plane Cl. 8.4.2 `[AS4100 Cl. 8.4.2]`
12. Combined — member out-of-plane Cl. 8.4.4 `[AS4100 Cl. 8.4.4]`
13. Overall result

Same y > 270 overflow guard and ASCII character constraint as beam PDF (no φ, λ, ², √, ≤ — use "phi", "lambda", "sqrt", "<=").

---

### 4.7 New files required

| File | Purpose |
|---|---|
| `src/types/column.ts` | `ColumnInputs`, `ColumnResults`, `ColumnIntermediates` types |
| `src/engineering/as4100/columnCapacity.ts` | `evaluateColumn()` — all 8 checks; returns `ColumnResults` |
| `src/components/ColumnGeometryPanel.tsx` | Height, section type/size, grade, k_x, k_y, auto-select |
| `src/components/ColumnLoadPanel.tsx` | G, Q, e_x, e_y inputs; displays computed N*, M*x, M*y |
| `src/components/ColumnResultsPanel.tsx` | Check table + interaction chart + PDF export button |
| `src/hooks/useColumnCalculations.ts` | `useMemo` wrapper around `evaluateColumn` |
| `src/utils/columnPdfExport.ts` | 3-page jsPDF export for column |
| `src/ColumnApp.tsx` | Column tab wrapper (state + layout, mirrors App.tsx beam section) |

**Reused without modification:**
- `src/engineering/sections/sectionDatabase.ts` — existing SHS/RHS/CHS/UC entries
- `src/engineering/sections/sectionUtils.ts` — `getSectionsByType`, `getDefaultSection`; add `calcFyHollow`
- `src/engineering/as4100/compressionCapacity.ts` — `calcAlphaC` reused directly
- `src/engineering/as4100/momentCapacity.ts` — classification + Ze + φMs reused

**Modified files:**
- `src/App.tsx` — `activeTab` state, nav buttons, mount both tabs
- `src/engineering/sections/sectionUtils.ts` — add `calcFyHollow(grade: 'C250'|'C350'|'C450'): number`
- `src/types/index.ts` — add hollow section grade union type if not already present

---

### 4.8 Section type filtering for column

`getSectionsByType` already exists. Pass it `'UC'`, `'SHS'`, `'RHS'`, or `'CHS'` for the column tool. No changes to the section database are needed — the existing entries are used as-is.

The grade dropdown should be **conditional on section type**:
- UC selected → show "Grade 300" / "Grade 350" (existing `SteelGrade` values)
- SHS/RHS/CHS selected → show "Grade 250" / "Grade 350" / "Grade 450" (new hollow grade values)

When the user changes section type, reset grade to the appropriate default (UC → G300; hollow → C350).

---

## File touch map

| File | Items |
|---|---|
| `src/index.css` | 1 |
| `src/components/RestraintPanel.tsx` | 1 |
| `src/utils/pdfExport.ts` | 3 |
| `src/App.tsx` | 2, 4 |
| `src/engineering/sections/sectionUtils.ts` | 4 |
| `src/types/index.ts` | 4 |
| `src/types/column.ts` | 4 (new) |
| `src/engineering/as4100/columnCapacity.ts` | 4 (new) |
| `src/components/ColumnGeometryPanel.tsx` | 4 (new) |
| `src/components/ColumnLoadPanel.tsx` | 4 (new) |
| `src/components/ColumnResultsPanel.tsx` | 4 (new) |
| `src/hooks/useColumnCalculations.ts` | 4 (new) |
| `src/utils/columnPdfExport.ts` | 4 (new) |
| `src/ColumnApp.tsx` | 4 (new) |

---

## Suggested sequencing

Items 1–3 are independent of each other and of Item 4. Item 4 has internal dependencies (types → engineering → components → PDF).

Recommended card sequence:

| Card | Items | Dependencies |
|---|---|---|
| 5R0 | 1 + 3 | None — CSS patch + PDF sign fix; disjoint files |
| 5R1 | 2 (nav only, ColumnApp stub) | None beyond App.tsx |
| 5R2 | 4 types + engineering | 5R1 (App structure exists) |
| 5R3 | 4 components + hook | 5R2 (types + engine exist) |
| 5R4 | 4 PDF export | 5R3 (ColumnResults shape known) |
| 5I1 | Integration QA | All cards done |

5R0 and 5R1 can run in parallel (disjoint files). 5R2 → 5R3 → 5R4 must be sequential.

---

## Verification gates (per card)

All cards: `npx tsc --noEmit` (0 errors) + `npm run build` (clean) before marking DONE.

| Card | Browser / PDF check |
|---|---|
| 5R0 | McVeigh theme: Simple button shows dark text; Recharts axis labels visible; export PDF page 2 BMD peak points downward |
| 5R1 | Both tabs clickable; Steel Beam state preserved on tab switch; Steel Column tab shows stub/placeholder |
| 5R2 | No browser check needed (pure logic); verify with a unit spot-check: 200UC52.2, L=4m, k_x=k_y=1.0, G=200kN, Q=150kN, e_y=50mm, G350 → hand-check N*, φNs, φNc, φMsx |
| 5R3 | Steel Column tab: inputs update live; results table appears; interaction chart renders; auto-select fires |
| 5R4 | Export PDF: 3 pages; page 1 inputs + table; page 2 interaction curve with design point; page 3 calc sheet with AS clause tags |
| 5I1 | Full integrated test: switch between tabs (beam state preserved); McVeigh theme visuals; column PDF complete |

---

## Key decisions (from design interview — do not re-open)

- Column section types: UC, SHS, RHS, CHS only (not UB, WB, PFC, EA)
- Load input: G + Q unfactored axial + eccentricities e_x, e_y (mm); moments derived automatically via AS1170 factored N*
- Effective lengths: k_x and k_y factors × height L; displayed as Le_x, Le_y
- LTB: for UC sections use Le_x as LTB effective length; for SHS/RHS/CHS no LTB (φMbx = φMsx)
- Hollow section grades: Grade 250/350/450 per AS1163 (flat fy); applies to SHS, RHS, CHS; UC keeps Grade 300/350 per AS3678
- Interaction diagram: capacity table + N*–M* chart for governing axis
- Auto-select: lightest passing section within selected type and grade
- Tab state: both tabs always mounted, state preserved on switch
- PDF: 3-page (inputs/table | interaction diagram | calc sheet with AS clauses)
- No new npm packages
- Sequential execution on main (no worktrees) — consistent with Rev 2/3/4 precedent
