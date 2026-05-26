# Steel Beam Design Tool — Project Journal

---

## 2026-05-25 — Initial Build & Audit

### Context
Project: Browser-based structural engineering tool for Australian Grade 300 steel beam design per AS4100-1998 and AS1170.1-2002. Stack: React 18 + TypeScript + Vite, client-side only, no network calls.

### Work completed prior to this session
When this session began, the project directory already contained a handover spec, a completed PRD, all agent profile `.md` files in `.orchestration/`, and a fully scaffolded `steel-beam-tool/` Vite project with all source files written. The build had been executed by a prior agent wave.

### Audit performed this session
Reviewed all critical source files:

| File | Status |
|---|---|
| `src/types/index.ts` | All interfaces present: SteelSection, PointLoad, LineLoad, AreaLoad, RestraintConfig, DesignInputs, CapacityResults, DiagramSet, ValidationError |
| `src/engineering/sections/sectionDatabase.ts` | Full InfraBuild catalogue: UB (27 sizes), UC (13), PFC (10), EA (12), SHS, RHS, CHS |
| `src/engineering/sections/sectionUtils.ts` | getSectionsByType, getDefaultSection, calcFy (tf≤17→300MPa), calcSelfWeightKnPerM |
| `src/engineering/sections/autoSelect.ts` | Iterates ascending by mass, short-circuits on first passing section |
| `src/engineering/as1170/loadCombinations.ts` | 3 combos (1.2G+1.5Q, G+Q, G), 201-point elastic BMD/SFD by superposition |
| `src/engineering/as4100/momentCapacity.ts` | AS4100 Cl. 5.2 section classification, Ze, φMs; Cl. 5.6 LTB (Moa, αs, φMbx) |
| `src/engineering/as4100/shearCapacity.ts` | AS4100 Cl. 5.11, web slenderness reduction |
| `src/engineering/as4100/deflection.ts` | Elastic superposition via strip integration; G+Q and G combos |
| `src/engineering/as4100/effectiveLength.ts` | Simple (FF/PP/PF/FC/custom) and advanced (Table 5.6.3) Le; αm per Cl. 5.6.1.1 |
| `src/engineering/evaluate.ts` | Orchestrates all checks, returns CapacityResults + DiagramSet |
| `src/hooks/useDesignCalculations.ts` | useMemo wrapper around evaluateDesign |
| `src/App.tsx` | Split layout (2/5 inputs, 3/5 results), ErrorBoundary around ResultsPanel |
| `src/components/GeometryPanel.tsx` | Span, tributary width, section type/size selects, auto-select button |
| `src/components/LoadPanel.tsx` | Point/line/area load tables with G/Q toggle; read-only self-weight row |
| `src/components/RestraintPanel.tsx` | Simple/Advanced mode toggle; αm override checkbox |
| `src/components/ResultsPanel.tsx` | Capacity table (demand/capacity/util/pass-fail); Recharts BMD+SFD; PDF export button |
| `src/utils/pdfExport.ts` | jsPDF A4 report with capacity table and diagrams |
| `vite.config.ts` | @tailwindcss/vite plugin, `@/` alias → `src/` |

### Verification results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | Pass — 791 modules, 1.19 MB bundle |
| `npm run dev` | Starts cleanly at http://localhost:5173 |

### Engineering spot-check: 6m span, 200UB25.4, 20 kN midspan (G only)
- fy = 300 MPa (tf = 7.8 mm ≤ 17 mm) ✓
- Section: compact (λ_f = 8.93 ≤ 9, λ_w = 35.4 ≤ 82) ✓
- Ze = min(Sx, 1.5·Zx) = min(260e3, 348e3) = 260,000 mm³
- φMs = 0.9 × 260,000 × 300 / 1e6 = **70.2 kN·m**
- Mmax (1.2G factored, with self-weight) = **37.35 kN·m**
- Section moment utilisation = **53.2%** → PASS

### Note on build plan's verification examples
The build plan spec contained two inaccurate expected values:
1. "Mmax ≈ 30 kN·m, util ≈ 0.42" — these figures used the unfactored G-only load. The code correctly applies the 1.2G factored combo per AS4100, giving 37.35 kN·m and 53% utilisation.
2. "δ ≈ 6.3 mm for 10 kN/m UDL" — the correct elastic deflection for a 200UB25.4 over 6 m with 10 kN/m is ~36.6 mm. The spec figure is wrong by a factor of ~5.8. The code formula (5wL⁴/384EI) is correct.

### Dev server
Started as a background process; accessible at http://localhost:5173 during the session.

---

## 2026-05-25 — UX Issue: Load Panel Input Fields Lack Labels

### Issue
The Line Loads, Area Loads, and Point Loads rows in the Loads panel have no column headers or placeholder text on the individual input fields. Users cannot tell which field is magnitude, start position, or end position without prior knowledge of the code.

### Resolution — COMPLETE
Column headers and placeholder text added to all load type rows in `LoadPanel.tsx`:
- Point Loads: "Magnitude (kN)", "Position (m)", "Category"
- Line Loads: "Mag. (kN/m)", "Start (m)", "End (m)", "Category"
- Area Loads: "Mag. (kPa)", "Start (m)", "End (m)", "Category"
Each input also carries a matching `placeholder` attribute.

---

## 2026-05-25 — Enhancement: Capacity Reference Lines on BMD/SFD Charts

### Request
Add horizontal reference lines to the BMD and SFD charts showing the current section's design capacity, so the engineer can visually see how close the demand curves are to the limit.

### Resolution — COMPLETE
Recharts `<ReferenceLine>` components added to `ResultsPanel.tsx`:
- **BMD chart** — φMbx and φMs lines, colour-coded green (pass) / red (fail), with value labels.
- **SFD chart** — +φVv and −φVv lines with matching colour coding.
Lines update live with section and load changes.

---

## 2026-05-25 — Bug: Auto-select Lightest Button Not Working

### Observed behaviour
Clicking "Auto-select lightest" in the Geometry panel had no visible effect. The code silently did nothing when `autoSelectSection` returned `null`.

### Resolution — COMPLETE
User-facing feedback added to `GeometryPanel.tsx` via an `autoSelectMsg` state variable displayed below the button. Three outcomes handled:
- No passing section found: "No passing section found in {type} — try reducing loads or changing section type." (red)
- Already optimal: "{designation} is already the lightest passing {type}." (green)
- New selection made: "Selected {designation} — lightest passing {type}." (green)

---

## 2026-05-25 — Enhancement: Deflection Diagram as Third Chart

### Request
Add a third chart below BMD and SFD showing the elastic deflection profile, with L/300 and L/360 limit lines.

### Resolution — COMPLETE
- `deflection.ts` — new export `calcDeflectionProfile(inputs, combo)` returns 81-point `DeflectionProfilePoint[]` array.
- `types/index.ts` — `DeflectionProfilePoint` interface added; `DiagramSet` extended with `deflectionGQ` and `deflectionG` arrays.
- `evaluate.ts` — calls `calcDeflectionProfile` for both G+Q and G combos and populates `DiagramSet`.
- `ResultsPanel.tsx` — third Recharts `LineChart` ("Deflection Profile (mm)") renders both combos with L/300 and L/360 limit reference lines, colour-coded by pass/fail.

---

## 2026-05-25 — Enhancement: McVeigh Consultants Branding & Theme System

### Request
Apply McVeigh Consultants branding with a theme switcher and logo in the header.

### Resolution — PARTIAL
Theme system infrastructure is complete:
- `index.css` — McVeigh CSS custom property palette defined (`--mc-green-dark`, `--mc-green-mid`, `--mc-gold`, `--mc-gold-light`, `--mc-cream`) applied via `[data-theme="mcveigh"]` selectors.
- `App.tsx` — full-width `<Header>` bar added with app title in gold and theme dropdown (McVeigh / Light) persisted to `localStorage`.
- All panel components updated to use themed classes.

**Outstanding:** Logo asset not yet in place. `App.tsx` contains an inline SVG placeholder with comment "swap for /logo.svg later". No `logo.svg` exists in `public/`. Awaiting logo file from client.

---

## 2026-05-25 — Enhancement: Add WB (Welded Beam) Section Type

### Request
Add Welded Beam (WB) sections to the section type dropdown.

### Resolution — COMPLETE
- `types/index.ts` — `'WB'` added to the `SectionType` union.
- `sectionDatabase.ts` — WB array added with 13 sections (700WB115 through 1000WB322), sorted ascending by mass and included in `SECTION_DATABASE` export.
- `sectionUtils.ts` — `'WB'` included in `getAllSectionTypes()`.
No changes were needed to engineering calculation modules — WB sections are treated identically to UB for classification and LTB purposes.

---

## 2026-05-26 — Rev 2 Orchestration Executed (7 items)

### Context
Executed `.nova/REV2-ORCHESTRATION-PLAN.md`, which maps the 7 improvements in
`.Improvements/Rev 2/HANDOVER.md` onto 5 implementation cards (R1–R5) + 1 integration card (I1).
Kanban board and per-card files created under `.nova/` (`KANBAN.md`, `cards/R1.md`…`I1.md`).

### Execution mode — deviation from worktree model
The plan specified 5 parallel worktree branches with a serial Integrator merge. All 5 cards own
completely disjoint files (zero conflicts), and a single agent did the work, so worktree isolation
+ merging would have been pure overhead. All changes were made directly on `main`. Every
verification gate the plan defined was still run: `tsc --noEmit`, `npm run build`, and Playwright
browser visual confirmation of each item.

### Items completed
| # | Item | Files | Result |
|---|---|---|---|
| 1 | Leading-zeros onBlur | GeometryPanel, LoadPanel, RestraintPanel | DONE (see deviation) |
| 6 | Count-based intermediate restraint spacing | RestraintPanel | DONE |
| 5 | Capacity reference lines always display | ResultsPanel | DONE |
| 2 | McVeigh logo (replace SVG) | App.tsx, public/logo.jpg | DONE |
| 3 | Rename h1 / `<title>` / PDF header | App.tsx, index.html, pdfExport.ts | DONE |
| 4 | Tab bar below header | App.tsx | DONE |
| 7 | Span-sync line/area load `end` | App.tsx | DONE |

### Key finding — HANDOVER's leading-zero fix was insufficient (item #1)
The prescribed pattern (add an onBlur that re-fires `onChange` with `parseFloat`) does **not**
clear leading zeros in React 19. When the user types `010`, the onChange during typing already
sets state to the number `10`; the onBlur re-firing `onChange({ span: 10 })` produces no
value-prop change, so React skips reconciling the controlled input's DOM text and `010` persists.
Caught in browser QA: the field displayed `010` while the span-derived `Le` readout correctly
showed `10.00 m` (state was right, display was stale).

**Fix applied:** onBlur now also imperatively normalizes the field —
`e.target.value = String(parseFloat(e.target.value) || 0)` — after firing onChange. This cleans
the display reliably (browser-confirmed `010` → `10`). onChange is unchanged so intermediate
typing like `0.` still works. Applied to all in-scope numeric inputs in GeometryPanel (2),
LoadPanel (8), RestraintPanel (3, incl. the new count input).

### R3 note
The reference lines were already rendered unconditionally (guarded only by the `results`/`diagrams`
null check) — there was no pass/fail wrapper to remove, and the HANDOVER's example code referenced
non-existent fields (`results.momentPass`). Added `ifOverflow="extendDomain"` to all six capacity
lines so they're never clipped off the auto-scaled axis. Verified visible in an overstressed FAIL
state.

### Verification
| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | clean (791 modules; pre-existing chunk-size advisory only) |
| Browser: leading-zero blur | `010` → `10` ✓ |
| Browser: span-sync | span 10→12 updates line load End to 12 ✓ |
| Browser: count-based restraints | span 12 count 3 → 3.00/6.00/9.00 m; count 0 hides; End A/B intact ✓ |
| Browser: reference lines | φMbx/φMs, ±φVv, L/300/L/360 all visible (FAIL state) ✓ |
| Browser: branding | logo image, "McVeigh Steel Designer" h1, "Steel Beam" tab, theme dropdown ✓ |
| Browser: tab title | "Steel Designer" ✓ |
| PDF header | string → "McVeigh Steel Designer" (code + build verified) |

Evidence screenshots: `.nova/evidence/rev2-integration-full.png`, `rev2-bmd-reflines.png`,
`rev2-charts-reflines.png`.

### Not done / follow-ups
- PDF report header verified by source inspection + successful build (static literal, no logic
  branch); not extracted from a generated PDF file. Visually confirmable via "Export PDF Report".
- ResultsPanel deflection-limit inputs (span/300, span/360) were left out of the leading-zero fix —
  they are outside HANDOVER item #1's stated scope (Geometry/Load/Restraint panels only).

---

## 2026-05-26 — Phase 3 (Rev 3) requirements received

Captured in `01 prompts.txt` (Phase 3) with reference images in `.Improvements/Rev 3/`
(1–4.jpg). **Not yet implemented** — recorded here for planning. Five items:

1. **Deflection combination** — change the G+Q deflection check to G+ψ_l·Q (dead + long-term
   factored live load) per AS1170. At the load input, add a way to confirm the live-load *type*
   (e.g. storage) so the corresponding ψ_l (long-term) factor is applied in the deflection check.
2. **Point-load location as % of span** — change point-load position input from an absolute
   distance (m) to a percentage of span (e.g. 50% = midspan).
3. **PDF export — overlapping text** — fix output text that overlaps other text on the report.
4. **PDF export — graphs** — make the PDF graphs match the main-app output charts (currently the
   PDF uses a separate vector-draw routine in `pdfExport.ts`).
5. **PDF export — calc summary** — add a section after the current output summarising the design
   calculations performed, each annotated with the AS clause it complies with (e.g. `[AS4100 6.6.1]`).

Notes for when this is planned: items 1–2 touch the engineering/types layer (live-load category +
ψ_l factor; position-as-% conversion), unlike Rev 2 which was UI-only. Items 3–5 are all in
`src/utils/pdfExport.ts`; item 4 likely needs chart rendering (e.g. render the Recharts SVG or
an html2canvas capture) rather than the current manual jsPDF line-drawing.

---

## 2026-05-26 — Rev 3 Orchestration Planned (5 items)

### Context
Handover spec at `.Improvements\Rev 3\HANDOVER.md` received and reviewed. Five items:
1. Deflection combo G+Q → G+ψ_l·Q with live load category selector
2. Point load position: absolute metres → % of span
3. PDF text overlap fix + move diagrams to page 2
4. PDF diagrams: add φMs/φMbx/φVv reference lines, L/360 label
5. PDF page 3+: running calculation sheet with DesignIntermediates + AS clause references

### Orchestration
Three implementation cards (3R1 → 3R2 → 3R3) + one integration card (3I1), strictly sequential.
Sequential execution on `main` (no worktrees) — justified by extensive file conflicts:
`types/index.ts` (Items 1+5), `deflection.ts`/`LoadPanel.tsx` (Items 1+2), `evaluate.ts` (Items 1+5),
`pdfExport.ts` (Items 2+3+4+5).

Agent roles: Implementer, Critic (spec conformance review, no implementation),
Test Validator (tsc + build + **browser MCP visual confirmation required for every card**).

Kanban board at `.nova/KANBAN.md`. Card files at `.nova/cards/3R1.md`–`3I1.md`.
Plan at `.nova/REV3-ORCHESTRATION-PLAN.md`.

### Key decisions
- `PointLoad.position` storage unit changes from metres to 0–100 percent (no migration needed:
  state resets on page reload, per HANDOVER note).
- `CapacityResults.deflectionGQ` renamed `deflectionGpsiLQ` throughout. All references updated
  in ResultsPanel.tsx, pdfExport.ts, and evaluate.ts.
- `pdfExport.ts` page structure post-3R2: page 1 = inputs + section props + check table;
  page 2 = diagrams; page 3+ = calc sheet.
- Default `liveLoadType = 'office'` (ψ_l = 0.4).
- No new npm packages.

---

## 2026-05-26 — Rev 3 Implemented (5 items) + recovered from false-DONE board

### Context
Resumed to execute the Rev 3 orchestration plan (`.nova/REV3-ORCHESTRATION-PLAN.md`). On inspection
the kanban board claimed all four cards DONE, but `steel-beam-tool/src/` contained **zero** Rev 3
changes: `psiFactors.ts` was absent, `liveLoadType`/`deflectionGpsiLQ`/`DesignIntermediates` did not
exist, and the old `deflectionGQ` field names were still in place. A prior run had marked the board
DONE without committing (or after losing) the implementation. Treated the source as ground truth,
reset the board, and implemented the plan for real.

### Work completed
Sequential execution on `main` (no worktrees), one card at a time, each gated with
`npx tsc --noEmit` + `npm run build` and committed before moving on (per-card commits chosen
specifically to prevent a repeat of the work-loss above).

- **3R1 — Engineering corrections (Items 1+2)** — commit `6c7d5ae`. Added `LiveLoadType` +
  `as1170/psiFactors.ts` (AS1170.1 Table 4.1 ψ_l values). Deflection check is now G+ψ_l·Q: both
  `calcDeflection` and `calcDeflectionProfile` take a `psiL` param; point-load position is stored as
  % of span and converted `(pos/100)*span` in `deflection.ts` and `loadCombinations.ts`. Renamed
  `deflectionGQ`→`deflectionGpsiLQ` (+ limit/passes) across types/evaluate/ResultsPanel/pdfExport.
  LoadPanel got the live-load dropdown at the top, "Position (% span)" header, 0–100 validation.
  Default `liveLoadType: 'office'`.
- **3R2 — PDF layout + diagrams (Items 3+4)** — commit `187dde6` (pdfExport.ts only). Restraint
  line wraps to 90 mm; Design Check Summary table moved to y=115 clear of both columns; diagrams
  relocated to page 2. `drawDiagram` gained an optional `refLines` param — BMD draws phiMs+phiMbx,
  SFD draws ±phiVv, all dashed and green/red by pass/fail; deflection profile now labels both
  L/<GQ> and L/<G> limit lines.
- **3R3 — PDF calc sheet (Item 5)** — commit `319301f`. Added `DesignIntermediates` to
  `CapacityResults`; extended `momentCapacity`/`shearCapacity` return objects (not replaced) and
  assembled the block in `evaluate.ts`. pdfExport renders a page-3 calc sheet: 13 numbered steps
  with AS clause tags, formula + substituted-value + result lines, and a y>270 overflow guard.

### QA (3I1 — Playwright MCP, now available)
All 7 HANDOVER verification gates pass. Test config: 150UB14.0, 10 m span, 50 kN Q point load at
50%, Storage live-load type (intentionally overloaded to exercise red/green reference lines).
Browser: dropdown at top of Load panel; Storage → "Deflection (G+0.6Q)" in table and chart legend;
"Position (% span)" header; 50% maps to midspan (symmetric deflection, no NaN). PDF (3 pages):
page 1 no overlap + "@ 50% (Q)"; page 2 ref lines colour-coded; page 3 calc sheet with clause tags.
Evidence in `.nova/evidence/rev3/` (3 screenshots + sample PDF).

### Key decisions / deviations from plan
- **PDF label text is ASCII** ("phiMs", "kN.m", "lambda_f", "sqrt", "<=") — jsPDF's standard
  helvetica cannot render Greek φ/λ/ψ, ·, ², √, ≤. The existing PDF code already used "kN.m" for
  this reason. UI (React/DOM) still uses proper ψ_l/φ glyphs.
- **Page-2 diagram width 160 mm** (not the plan's 190 mm) so the right-edge capacity-line labels
  Item 4 requires actually fit on the A4 page instead of clipping.
- **`PdfExportArgs` was not extended for `intermediates`** and ResultsPanel's call site was left
  unchanged — `intermediates` lives on `CapacityResults`, which `exportToPDF` already receives, so
  it is read as `results.intermediates`. Cleaner than the plan's separate arg; avoids touching a
  file 3R3 did not own.
- **Page-4 overflow not produced**: the calc sheet's fixed 13-step content fits on page 3. The
  overflow guard is implemented exactly per spec; it simply doesn't trigger for this content length.

### State
All four Rev 3 cards DONE on `main`. tsc clean, build clean.

### Commit & push (2026-05-27)
Tracking/docs committed as `7cc142f` (plan, cards, KANBAN, QA evidence, journal). All five Rev 3
commits pushed to `origin/main` (`b3499e6..7cc142f`): 3R1 `6c7d5ae`, 3R2 `187dde6`, 3R3 `319301f`,
tracking `7cc142f`. Working tree clean and in sync with the remote.
