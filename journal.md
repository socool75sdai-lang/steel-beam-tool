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

---

## 2026-05-27 — Rev 4 Requirements Captured (8 items)

### Context
Requirements elicited via design interview. Handover spec written to `.Improvements/Rev 4/HANDOVER.md`.
Not yet implemented — planning agent to produce orchestration plan before execution.

### Items
| # | Item | Status |
|---|---|---|
| 1 | Fixed end support conditions (Pin-Pin / Fixed-Pin / Pin-Fixed / Fixed-Fixed) in Geometry panel | Specified |
| 2 | Compressive axial load input + combined action checks (AS4100 Cl. 8.4) | Specified |
| 3 | Collapsible calculation working in Results panel (bending, shear, deflection + assumption notes) | Specified |
| 4 | Job Number and Job Name fields; reflected in PDF and filename | Specified |
| 5 | Save/Load JSON file (import/export DesignInputs + job metadata) | Specified |
| 6 | McVeigh theme dark text fix for all input elements | Specified |
| 7 | Dynamic deflection label showing actual ψ_l factor | Specified |
| 8 | Grade 300 / Grade 350 steel grade dropdown in Geometry panel | Specified |

### Key decisions recorded in HANDOVER.md
- Fixed supports auto-set and lock the corresponding LTB end restraint to F (Advanced mode)
- Compressive load: single axial value (kN) + G/Q toggle; two new result rows hidden when N*=0
- Expanded calc: collapsible below results table; all three check groups; Unicode symbols; assumption notes
- Job fields: stateless (no localStorage); PDF shows two-line block at top of page 1
- Export filename: `[JobNo]_[JobName]_YYYYMMDD_HHMM.{pdf|json}`, blank parts omitted
- Import: file picker only (no drag-and-drop); restores jobNumber, jobName, DesignInputs
- Grade 350 fy: 360/340/330 MPa by tf per AS3678; applies to all section types
- Sequencing: 6 cards (4R0→4R5), strictly sequential on main

---

## 2026-05-27 — Rev 4 Orchestration Planned (8 items)

### Context
Handover spec at `.Improvements\Rev 4\HANDOVER.md` received and reviewed. Eight items across
three categories: engineering additions (Items 1, 2), UI/output expansion (Items 3, 4, 5),
and polish (Items 6, 7, 8). All decisions final — confirmed with engineer 2026-05-27.

### Items
1. Fixed end support conditions (PP / FP / PF / FF) — FEM analysis in loadCombinations.ts + deflection.ts
2. Compressive axial load + combined action checks (AS4100 Cl. 8.4) — new compressionCapacity.ts
3. Collapsible calculation working in Results panel — reads DesignIntermediates (no new computation)
4. Job Number + Job Name fields (stateless; PDF block + filename)
5. Save/Load JSON file (import/export DesignInputs + job metadata)
6. McVeigh theme dark text fix — one CSS rule in index.css
7. Dynamic deflection label (G+{psiL}Q) — one string change in ResultsPanel.tsx
8. Grade 300 / Grade 350 steel grade dropdown — calcFy updated in sectionUtils.ts

### Orchestration
Six implementation cards (4R0 → 4R5) + one integration card (4I1), strictly sequential on `main`.
Sequential execution justified by file conflicts: `types/index.ts` (Items 1, 2, 8),
`evaluate.ts` (Items 1, 2, 8), `pdfExport.ts` (Items 1, 2, 4).

Agent roles: Implementer, Critic (spec conformance review, cycle-limited, no implementation),
Test Validator (tsc + build + **Playwright MCP browser visual confirmation required for every card**).

Kanban board at `.nova/KANBAN.md`. Card files at `.nova/cards/4R0.md`–`4I1.md`.
Plan at `.nova/REV4-ORCHESTRATION-PLAN.md`.

### Key sequencing decisions
- 4R0 first (trivial, zero risk) → 4R1 (types only) → 4R2 (pure UI state, no engineering)
- 4R3 before 4R4: `DesignInputs` + `evaluate.ts` must be stable before adding compression types
- 4R5 last (reads all DesignIntermediates — must come after 4R3 + 4R4 populate new fields)
- No worktrees — consistent with Rev 2/3 precedent and justified by same-file conflicts

### Key design decisions
- `supportCondition: 'PP'` default — all existing behaviour unchanged when not set
- `axialCompression: null` default — combined rows hidden, no impact on existing checks
- `steelGrade: 'G300'` default — calcFy unchanged for all existing callers (default parameter)
- Compression αc: Perry-Robertson (HR residual stress category) per AS4100 Table 6.3.3(a)
- McVeigh CSS fix: `[data-theme="mcveigh"] input, textarea, select option { color: #111; background-color: #fff }`
- Grade 350 fy: 360/340/330 MPa by tf thresholds (≤11 / ≤17 / >17 mm) per AS3678
- No new npm packages.

---

## 2026-05-27 — Rev 4 Implemented (8 items, all DONE)

### Outcome
All six implementation cards (4R0–4R5) plus the integration card (4I1) executed sequentially on
`main`. Every card gated with `npx tsc --noEmit` (0 errors) + `npm run build` (clean) + Playwright
MCP browser confirmation. No new npm packages. Evidence in `.nova/evidence/rev4/`.

### Commits
| Card | Items | Commit | Summary |
|---|---|---|---|
| 4R0 | 6, 7 | 561eca1 | McVeigh input dark-text CSS rule; dynamic G+{ψ_l}Q deflection label |
| 4R1 | 8 | b2330b2 | SteelGrade type; calcFy(section, grade); Grade 350 360/340/330 MPa; Geometry dropdown |
| 4R2 | 4, 5 | b2858fa | Job No/Name fields; JSON import/export round-trip; PDF job block + filename convention |
| 4R3 | 1 | 0a033ce | SupportCondition PP/FP/PF/FF; FEM superposition in BMD/SFD + deflection; restraint lock/unlock |
| 4R4 | 2 | 6fc90cb | compressionCapacity.ts (new); φNs/φNc; combined section/member interaction; conditional rows |
| 4R5 | 3 | 3a89c60 | Collapsible expanded calc working (BENDING/SHEAR/DEFLECTION + conditional COMBINED ACTIONS) |

### Verification highlights (browser + PDF)
- 4R0: McVeigh inputs render dark text on white; label updates Office→G+0.4Q, Storage→G+0.6Q.
- 4R1: 200UB25.4 G300→G350 raised φMs 70.20→83.22 kN·m, φMbx 26.66→27.39 kN·m.
- 4R2: export `J001_TownHall_YYYYMMDD_HHMM.json` ({jobNumber,jobName,inputs}); reload clears; import
  restores all state ("Loaded: …"); PDF filename + page-1 job block confirmed.
- 4R3: 360UB44.7/10 m/20 kN·m UDL — M* PP 306.58 → FF 204.40 kN·m (=wL²/12 vs wL²/8), δ 109.97 →
  21.99 mm (=1/5). FF BMD shows hogging ends + sagging midspan; PF M*=wL²/8 (propped, correct).
  FF locks both end restraints (greyed + note); PF locks End B only; PP releases.
- 4R4: combined rows hidden at N*=0, appear at N*>0; member interaction drives overall FAIL.
- 4R5: toggle expands/collapses; substituted values match the results table; COMBINED ACTIONS
  conditional on N*>0.
- Integrated PDF (J001/Town Hall/FF/100 kN axial): page 1 job block without overlap; page 3 states
  Support: Fixed-Fixed with end moments and a full COMBINED ACTIONS block.

### Deviation from plan (recorded)
- **4R4 αc:** the orchestration plan supplied an approximate `calcAlphaC` closed form that returned
  αc ≈ 0.85 at λn ≈ 175, whereas the spec's cited source (AS4100 Table 6.3.3(a), HR category) gives
  αc ≈ 0.22. Replaced it with the exact AS4100 Cl. 6.3.3 curve (αb = 0) so φNc matches the standard.
  All other implementation followed the plan/HANDOVER as written.

### Tracking & status
- Board (`.nova/KANBAN.md`) shows all seven cards DONE; card files 4R0–4I1 carry per-card STATUS,
  commit hashes and evidence paths.
- Orchestration tracking, card files, QA evidence and this journal entry committed in `4b0ba6a`.
- Rev 4 commits pushed to `origin/main` (`572b592..b6b6bcb`). Dev server at `localhost:5173`
  reflects the final state.

---

## 2026-05-28 — Rev 4 source doc revision

Updated the Rev 4 requirements source document (`.Improvements/Rev 4/Claude REV 4.docx`); committed
in `92ad022` and pushed to `origin/main`. No source-code or behaviour changes.

---

## 2026-06-03 — Rev 5 Requirements Captured (4 items)

### Context
Requirements elicited via design interview. Handover spec written to `.Improvements/Rev 5/HANDOVER.md`.
Not yet implemented — planning agent to produce orchestration plan before execution.

### Items
| # | Item | Status |
|---|---|---|
| 1 | White-on-white text fix — McVeigh theme (Restraints toggle + Recharts labels) | Specified |
| 2 | Tab navigation — add Steel Column tab beside Steel Beam; both tabs preserve state | Specified |
| 3 | PDF BMD orientation — currently upside-down vs main app; sign fix in pdfExport.ts | Specified |
| 4 | Steel Column design tool (AS4100) — new tab with full column design capability | Specified |

### Key decisions recorded in HANDOVER.md
- Column section types: UC, SHS, RHS, CHS only (UB/WB/PFC/EA excluded — not used as columns)
- Loads: G + Q unfactored axial + eccentricities e_x, e_y (mm); N* and M* computed automatically via AS1170 factored loads
- Effective lengths: separate k_x, k_y factors × column height L → Le_x, Le_y
- LTB: UC sections use Le_x as LTB effective length; SHS/RHS/CHS have no LTB (closed sections, φMbx = φMsx)
- Hollow section grades: Grade 250/350/450 per AS1163 (flat fy, no thickness reduction); UC keeps Grade 300/350 per AS3678
- Output: capacity check table + N*–M* interaction diagram for governing axis (Recharts LineChart)
- Auto-select: lightest passing section within selected type and grade (same pattern as beam)
- Tab state: both tabs always mounted (CSS hidden when inactive), state preserved on switch
- PDF: 3-page (inputs + check table | interaction diagram | calc sheet with AS clause annotations)
- Sequencing: 6 cards (5R0 → 5R4 + 5I1); 5R0 and 5R1 parallel; 5R2→5R3→5R4 sequential; no worktrees

---

## 2026-06-03 — Rev 5 Orchestration Planned (4 items)

### Context
Handover spec at `.Improvements\Rev 5\HANDOVER.md` received and reviewed. Four items: three
targeted patches (white-on-white text, tab navigation, PDF BMD orientation) and one large new
feature (Steel Column design tool, AS4100 Cl. 6 + 8, 8 new files). All decisions final —
confirmed with engineer 2026-06-03.

### Items
| # | Item | Scope |
|---|---|---|
| 1 | White-on-white text fix — Recharts labels (CSS) + Restraints toggle (RestraintPanel) | Targeted patch |
| 2 | Tab navigation — Steel Beam / Steel Column; both tabs always mounted (state preserved) | App.tsx + stub |
| 3 | PDF BMD orientation — sign flip in drawDiagram (minus → plus for Y coordinate) | One-liner |
| 4 | Steel Column design tool (AS4100) — new tab with full column design capability | Large feature |

### Orchestration
Five implementation cards (5R0 → 5R4) + one integration card (5I1), sequential on `main`.
5R0 and 5R1 logically parallel (disjoint files) but executed sequentially for consistency.
5R2 → 5R3 → 5R4 strictly sequential (types → components → PDF).

Agent roles: Implementer, Critic (spec conformance, cycle-limited, no implementation),
Test Validator (tsc + build + Playwright MCP browser visual confirmation required for every card).

Kanban board at `.nova/KANBAN.md`. Card files at `.nova/cards/5R0.md`–`5I1.md`.
Plan at `.nova/REV5-ORCHESTRATION-PLAN.md`.

### Key sequencing decisions
- 5R0 first (trivial CSS + PDF one-liner, zero risk to App state)
- 5R1 second (App.tsx tab structure must exist before column types are written in 5R2)
- 5R2 (pure logic: types + engineering engine, no components)
- 5R3 (components + hook — requires types from 5R2)
- 5R4 (PDF — requires ColumnResults shape from 5R3 to be final)
- No worktrees — consistent with Rev 2/3/4 precedent

### Key design decisions
- Tab mounting: both tabs always mounted (CSS `hidden` class, not conditional unmount)
- Column section types: UC, SHS, RHS, CHS only (UB/WB/PFC/EA excluded per spec)
- Hollow grade: C250/C350/C450 per AS1163 (flat fy); UC keeps G300/G350 per AS3678
- Column LTB: UC uses Le_x as LTB effective length; hollow: phiMbx = phiMsx (no LTB)
- N* = max(1.2G + 1.5Q, G) — governing combo per AS1170.1
- Eccentricities: e_y causes M*x (bending about x-axis); e_x causes M*y
- Interaction diagram: section envelope + member envelope + design point; Recharts LineChart
- PDF: 3-page (inputs+table | interaction diagram | calc sheet with AS clauses); ASCII only
- No new npm packages

---

## 2026-06-03 — Rev 5 Implementation Complete (all 6 cards DONE)

### Outcome
All five implementation cards (5R0–5R4) plus the integration card (5I1) executed
sequentially on `main`. `npx tsc --noEmit` -> 0 errors and `npm run build` -> clean
after every card. All browser + PDF QA gates green.

### Commits
| Card | Commit | Scope |
|---|---|---|
| 5R0 | a5493a0 | index.css Recharts fill (#333333) + RestraintPanel toggle text-gray-800 + pdfExport BMD sign flip (field-conditional: moment sagging-down, shear unchanged) |
| 5R1 | f1baa7c | App.tsx activeTab + two-tab nav + both tabs mounted (CSS hidden); ColumnApp.tsx stub |
| 5R2 | 9ee0572 | types/column.ts; columnCapacity.ts evaluateColumn (AS4100 Cl.6+8, 8 checks); calcFyHollow; HollowSteelGrade; exported calcAlphaC |
| 5R3 | d06a7a3 | ColumnGeometryPanel/LoadPanel/ResultsPanel, useColumnCalculations, full ColumnApp (interaction chart, auto-select, conditional grade dropdown) |
| 5R4 | b4008e0 | columnPdfExport.ts (3-page, ASCII-only, jsPDF interaction diagram); wired Export button; threaded jobNumber/jobName App->ColumnApp->ResultsPanel |

### Verification highlights
- Spot-check 200UC52.2 (L=4m, G=200, Q=150, e_y=50, G350) live in UI matched hand-calc
  exactly: N*=465.0 kN, phiNs=2038.0, phiNc_x=1730.0, phiNc_y=1236.1, phiMsx=174.06,
  ratios 0.362/0.510/0.560, class noncompact, fy=340 MPa — all PASS.
- McVeigh Recharts text computed fill = rgb(51,51,51); Restraints inactive toggle dark on white.
- Tab state preserved: beam span 12.5 m survived a column round-trip.
- Auto-select picked 200UC46.2 (lightest passing UC); SHS switch -> grade dropdown 250/350/450.
- Column PDFs: UC -> 3 pages with full LTB working; SHS -> "No LTB - closed section" on step 5;
  both ASCII-only with AS clause tags. Beam PDF regression -> still 3 pages (BMD/SFD/calc sheet).

### Implementation note (5R0 nuance)
drawDiagram is shared by BMD and SFD. To satisfy both gates (BMD peak downward AND SFD
positive-shear above baseline) the sign was made field-conditional (moment +1, shear -1)
rather than an unconditional minus->plus, so the SFD output is byte-identical to pre-fix.

Evidence: `.nova/evidence/rev5/`. Board: `.nova/KANBAN.md`. Cards: `.nova/cards/5R0.md`–`5I1.md`.

---

## 2026-06-06 — Rev 6 Requirements Captured (4 items)

### Context
Requirements elicited via design interview (grill-me). Handover spec written to
`.Improvements/Rev 6/HANDOVER.md`. Reference images at `.Improvements/Rev 6/1.jpg` (restraints panel)
and `3.jpg` (results summary line + grey text). **Not yet implemented** — planning agent to produce an
orchestration plan before execution. All decisions below confirmed final with the engineer.

### Items
| # | Item | Type | Status |
|---|---|---|---|
| 1 | Split single intermediate-restraint field into separate **top** and **bottom** flange restraint counts (Steel Beam) | Engineering + UI | Specified |
| 2 | New **Steel Brace** tab — horizontal beam-column per AS4100 (Cl. 6 + 8.3/8.4) | Large new feature | Specified |
| 3 | On-screen **"Show calculations" collapsible** added to Steel Column and Steel Brace (parity with beam) | UI | Specified |
| 4 | Grey helper text → **cream** on the dark green panels, all three tabs (scoped, no white-on-white) | CSS polish | Specified |

### Key decisions recorded in HANDOVER.md
- **Item 1:** two count fields (top/bottom), Advanced mode only, each auto-evenly-spaced as today. LTB uses
  the **critical (compression) flange per segment** from BMD sign (top governs sagging, bottom governs
  hogging/uplift); bottom-flange restraints have no effect on a plain PP sagging beam (noted in calc).
  **Governing segment = lowest φMbx** (per-segment capacity loop, not longest segment); display governing
  bay's Le/αm/αs + position. Schema `intermediate` → `intermediateTop`/`intermediateBottom`, **no back-compat**
  (old exported files were tests, won't be re-imported).
- **Item 2 (Brace):** compression + **major-axis bending only**, Cl. 8.3/8.4 interaction reusing the Column
  engine. **Single ultimate N\*** applied in all combos. Bending M\* from self-weight + **G/Q/Wind** point
  loads via 3 combos (`1.2G+1.5Q`, `1.2G+Wu+ψc·Q`, `0.9G+Wu`). **Self-weight deflection ≤ L/360** (editable).
  **kx/ky** effective-length factors × span; φNc both axes. **CHS/SHS/RHS × C250/C350/C450**, default
  **CHS/C350**, no LTB (closed). Auto-lightest **searches the full type×grade matrix** (deviation from
  beam/column, which search within selected type). **Three graphs** (N–M interaction + BMD + deflection),
  3-page ASCII PDF. Tab order **Beam | Column | Brace**, all mounted. ψc from a new live-load dropdown
  (extend `psiFactors`).
- **Item 3:** add beam-style collapsible to Column (reads existing `ColumnIntermediates`) and Brace; keep
  Column PDF calc sheet and keep on-screen text consistent with it.
- **Item 4:** recolour grey text to cream **only where it sits on the green panel**, scoped to
  `[data-theme="mcveigh"]`; leave calc-box/table/Recharts text dark (no white-on-white); Light theme
  unaffected; all three tabs.

### Suggested sequencing (in HANDOVER, for planning agent)
Strictly sequential on `main` (Rev 2–5 precedent): 6R0 (Item 4 CSS) → 6R1 (Item 1) → 6R2 (Item 3 Column
collapsible) → 6R3 (Brace engine+types) → 6R4 (Brace UI+hook, incl. its collapsible) → 6R5 (Brace PDF) →
6I1 (integration QA). Each gated with tsc + build + Playwright MCP. No new npm packages.

### Open assumptions flagged (not yet confirmed)
- JSON Save/Load stays **beam-only** (Column already excluded; Brace assumed likewise).
- ψc values from AS1170.0 Table 4.1.

---

## 2026-06-06 — Rev 6 Orchestration Planned (4 items)

### Context
Handover at `.Improvements/Rev 6/HANDOVER.md` reviewed (decisions final, captured via grill-me).
Four items: (1) split beam intermediate restraint into top/bottom-flange counts with
per-compression-flange governing-segment LTB (lowest-phiMbx governs, not longest); (2) new Steel
Brace tab — horizontal beam-column per AS4100 Cl. 6 + 8.3/8.4, reusing the Column engine; (3)
on-screen "Show calculations" collapsible for Column and Brace; (4) grey helper text -> cream on the
dark-green McVeigh panels, all three tabs.

### Orchestration
Seven cards (6R0 -> 6R5 + 6I1), strictly sequential on `main`, no worktrees (Rev 2-5 precedent).
6R0 CSS (zero risk) -> 6R1 beam restraint rework -> 6R2 column collapsible -> 6R3 brace engine+types
+psi_c -> 6R4 brace UI+graphs+collapsible+tab -> 6R5 brace PDF -> 6I1 integration QA.

Roles: Implementer; Critic subagent (spec/code review, no fixes, cycle-limited); Validator subagent
(tsc + build + Playwright-MCP browser visual confirmation of each issue resolved, every card).
Board `.nova/KANBAN.md`; cards `.nova/cards/6R0.md`-`6I1.md`; plan
`.nova/REV6-ORCHESTRATION-PLAN.md`; evidence `.nova/evidence/rev6/`.

### Key design decisions
- Item 1: RestraintConfig.intermediate REPLACED by intermediateTop[]+intermediateBottom[] (clean
  break, no migration shim). Compression flange per segment from BMD sign (sagging->top, hogging
  ->bottom). Governing segment = lowest phiMbx (own Le + own alphaM). PP plain sagging -> bottom
  restraints have no effect (note emitted).
- Item 2: single factored N* applied in all combos; major-axis bending only (M*y=0); 3 combos
  (1.2G+1.5Q | 1.2G+Wu+psi_c.Q | 0.9G+Wu), worst |M*|; closed section -> phiMbx=phiMsx; deflection
  from self-weight only vs editable L/limit (default 360); auto-lightest searches the FULL matrix
  {CHS,SHS,RHS}x{C250,C350,C450}; psi_c added to psiFactors (AS1170.0 Table 4.1).
- Item 3: collapsibles read existing intermediates; on-screen text reads identically to the PDF.
- Item 4: class-based .mc-subtle (gray-600 in Light, cream under [data-theme="mcveigh"]); only
  grey-on-green elements reclassed; white-bg + Recharts text stay dark.
- No new npm packages.

### Open items flagged to engineer (see plan section 8)
JSON Save/Load stays beam-only (Brace excluded) - confirm. psi_c values vs AS1170.0 Table 4.1 for
any ambiguous live-load category - confirm.

---

## 2026-06-06 — Rev 6 Complete (4 items shipped)

All seven cards DONE on `main` (6R0 a6f4d3d, 6R1 288f35b, 6R2 6d5ae7f, 6R3 4110e94, 6R4 813c7cd,
6R5 06ee913, 6I1 integration). Each gated with `npx tsc --noEmit` (0 errors) + `npm run build`
(clean); browser + PDF QA via Playwright MCP.

### Delivered
- **Item 1** — Beam intermediate restraint split into top-flange + bottom-flange counts (Advanced
  mode). New per-compression-flange governing-segment LTB: each flange's restraints segment the beam
  independently, a segment is evaluated only where that flange is in compression (sagging->top,
  hogging->bottom from the factored BMD sign), and the governing segment is the lowest-phiMbx one
  (own Le + own alpha_m), not the longest. RestraintConfig.intermediate replaced by
  intermediateTop/intermediateBottom (clean break). Results + beam PDF show the governing segment
  range/flange; PP plain-sagging emits the "bottom restraints carry no compression" note.
- **Item 2** — New Steel Brace tab: horizontal beam-column per AS4100 Cl. 6 + 8.3/8.4, reusing the
  column hollow path. Single factored N* in all combos; major-axis bending = self-weight UDL +
  signed-Wind/G/Q point loads, worst of 3 combos (1.2G+1.5Q | 1.2G+Wu+psi_c.Q | 0.9G+Wu);
  phiMbx=phiMsx (closed); self-weight L/limit deflection. Auto-lightest searches the full
  {CHS,SHS,RHS}x{C250,C350,C450} matrix. Three graphs + 3-page ASCII PDF. psi_c added to psiFactors.
- **Item 3** — On-screen "Show calculations" collapsible for Column and Brace, reading identically
  to their PDF calc sheets.
- **Item 4** — Class-based .mc-subtle recolours the grey-on-green summary lines to cream under
  [data-theme=mcveigh]; white-bg calc/table/Recharts text stays dark; Light theme byte-identical.

### Verification (6I1)
Item 1: PP bottom restraints no effect (+note), top restraints Le 6.00->2.00 m + phiMbx rise, FF
bottom restraints govern the hogging end (segment 0-2 m). Item 2: live engine matched hand-calc
exactly; auto-lightest global; 3 graphs; 3-page PDF. Item 3: column/brace collapsibles match tables.
Item 4: cream on green, dark on white, Light unchanged. No new npm packages; beam+column PDFs
regress clean.

### Open items still flagged to engineer
- JSON Save/Load remains beam-only (Brace + Column excluded) — confirm if cross-tab save/load wanted.
- psi_c values use AS1170.0 Table 4.1 (floor categories = their psi_l; roof 0.0) — confirm exact
  psi_c for any ambiguous live-load category (e.g. parking/storage) against the engineer's reference.

### Pushed to remote
2026-06-06 — all eight Rev 6 commits pushed to `origin/main` (`4d2181f..97e1418`,
github.com/socool75sdai-lang/steel-beam-tool). Working tree clean.
