# Rev 6 Orchestration Plan — McVeigh Steel Designer

## Context

**Why this work exists.** The engineer captured a confirmed design interview in
`.Improvements/Rev 6/HANDOVER.md` (dated 2026-06-06, all decisions final). Rev 6 adds four
improvements to the McVeigh Steel Designer (React 18 + TS + Vite, client-side only, in
`steel-beam-tool/`, dev server `http://localhost:5173`):

| # | Item | Type | Touches |
|---|------|------|---------|
| 1 | Split beam intermediate restraint into **top-flange** + **bottom-flange** counts, with per-compression-flange governing-segment LTB | Engineering + UI | Beam |
| 2 | New **Steel Brace** tab — horizontal beam-column per AS4100 Cl. 6 + 8.3/8.4 | Large new feature | New tab |
| 3 | On-screen **"Show calculations"** collapsible added to **Steel Column** and **Steel Brace** | UI parity | Column + Brace |
| 4 | Grey helper text → **cream** on dark-green McVeigh panels, all three tabs | CSS polish | All |

**Intended outcome.** A clean Rev 6 schema change (no back-compat shim) that makes the beam's LTB
behave like real flange restraint (gravity beams: many top, few bottom), adds a full beam-column
design tool that reuses the existing Column engine, brings calc-sheet parity on screen, and fixes
the low-contrast text the engineer flagged in `3.jpg`.

**This plan is the orchestration spec; it must not be auto-executed.** The planning deliverables in
§0 (lodging the kanban board + cards, and the journal entry) and all source changes are performed
only *after* explicit go-ahead, in the execution context. The engineer asked that the plan be
saved and reviewed first; do not begin implementation until told to.

### Grounding from codebase exploration (current state — verified)

- **Item 1.** `src/types/index.ts` `RestraintConfig` (≈L65–73) has `intermediate: number[]`.
  `src/engineering/as4100/effectiveLength.ts` `calcEffectiveLength(span_m, restraint)` (≈L45–81)
  builds segments from `intermediate`, treats each as a **fully-restrained ('F') cross-section
  point**, and returns the **longest** segment's Le (`maxLe`, ≈L78). `calcAlphaM(bmd, start, end)`
  (≈L104–136) already accepts a segment range. `src/engineering/evaluate.ts` (≈L28–33) calls
  `calcEffectiveLength` once for the whole span and `calcAlphaM(bmd, 0, span)`, then
  `calcMemberCapacity(section, fy, Le*1000, alphaM)`. Sign convention: positive moment = sagging
  (chart uses `reversed: true` to plot positive downward) ⇒ **sagging → top flange compression**,
  **hogging → bottom flange compression**.
- **Item 2.** High reuse available: `src/engineering/as4100/columnCapacity.ts`
  `evaluateColumn(inputs)` + exported `calcAlphaC(lambdaN)` already implement Cl. 8.3.3 / 8.4.2 /
  8.4.4 and hollow-section φMb = φMs (no LTB). `sectionUtils.ts` has `calcFyHollow`,
  `calcSelfWeightKnPerM`, `getSectionsByType`. Section DB rows (CHS/SHS/RHS) carry
  `Ag, Ix, Iy, Sx, Zx, J` (Iw=0). `psiFactors.ts` has `getPsiL` / `PSI_L_FACTORS` /
  `LIVE_LOAD_LABELS` but **no ψc yet**. Column tab files (`ColumnApp.tsx`,
  `ColumnGeometryPanel/LoadPanel/ResultsPanel.tsx`, `useColumnCalculations.ts`,
  `columnPdfExport.ts`) exist and are the clone template. The N–M interaction chart is **inline**
  in `ColumnResultsPanel.tsx` (Recharts `LineChart`, three series). `buildFilename(jobNo, jobName,
  ext)` is exported from `src/utils/pdfExport.ts` (≈L20–27).
- **Item 3.** The beam's "Show calculations" collapsible is **inline** in
  `src/components/ResultsPanel.tsx` (≈L197–312): monospace block, formula → substituted → result,
  AS-clause tags. `ColumnResultsPanel.tsx` currently **lacks** it.
- **Item 4.** `src/index.css` has `[data-theme="mcveigh"]` block with `--mc-cream: #F5F0E8` and
  `.mc-panel { color: var(--mc-cream) }`. The flagged summary line / deflection labels use Tailwind
  `text-gray-600` utilities that **override** the inherited cream → low contrast on green. Fix must
  be scoped so it does **not** affect white-background contexts (calc box, tables, Recharts) or the
  Light theme.
- **Tabs.** `src/App.tsx` (≈L38) `activeTab: 'beam' | 'column'`; both tabs always mounted, inactive
  gets `hidden` class (≈L193–218). Extend to add `'brace'`.

---

## 0. Planning Deliverables (first actions in the execution context — then PAUSE)

These administrative setup tasks are performed as the **first and only actions** at execution start,
**before any source code changes**. They lodge progress into the existing kanban and journal. After
writing them, **PAUSE** and await explicit instruction to begin implementation.

1. **Save orchestration plan** → this document, saved to `.nova/REV6-ORCHESTRATION-PLAN.md`
   (project convention; matches `REV5-ORCHESTRATION-PLAN.md`) and mirrored to
   `.Improvements/Rev 6/REV6-ORCHESTRATION-PLAN.md`.
2. **Update `.nova/KANBAN.md`** → replace Rev 5 board content with the Rev 6 board (see §3).
3. **Create card files** → `.nova/cards/6R0.md` … `.nova/cards/6I1.md` (7 files, see §5).
4. **Create evidence dir** → `.nova/evidence/rev6/` (Validator screenshots land here).
5. **Update `journal.md`** → append the "Rev 6 Orchestration Planned" entry (see §7).
6. **Confirm** → report each file path written, then PAUSE.

---

## 1. Card Grouping

Sequencing follows the handover's suggested order (risk-ascending, dependency-respecting):
CSS first (zero risk), then the beam restraint rework, then column calc parity, then the brace
built bottom-up (engine → UI → PDF), then integration QA.

| Card | Items | Title | Primary files owned |
|------|-------|-------|---------------------|
| **6R0** | 4 | Grey→cream helper text (McVeigh, all tabs) | `src/index.css`; `ResultsPanel.tsx`, `ColumnResultsPanel.tsx` (+ Brace panel later) — flagged grey-on-green elements |
| **6R1** | 1 | Beam top/bottom flange restraints + per-compression-flange governing-segment LTB | `src/types/index.ts`, `engineering/as4100/effectiveLength.ts`, `engineering/evaluate.ts`, `components/RestraintPanel.tsx`, `components/ResultsPanel.tsx`, `utils/pdfExport.ts`, `App.tsx` |
| **6R2** | 3 (Column) | Column "Show calculations" collapsible | `src/components/ColumnResultsPanel.tsx` |
| **6R3** | 2 (engine) | Brace types + engine + ψc | `src/types/brace.ts` (NEW), `engineering/as4100/braceCapacity.ts` (NEW), `engineering/as1170/psiFactors.ts` |
| **6R4** | 2 (UI) + 3 (Brace) | Brace UI + hook + tab wiring + 3 graphs + auto-select + Brace collapsible | `src/BraceApp.tsx` (NEW), `components/BraceGeometryPanel.tsx`/`BraceLoadPanel.tsx`/`BraceResultsPanel.tsx` (NEW), `hooks/useBraceCalculations.ts` (NEW), `src/App.tsx` |
| **6R5** | 2 (PDF) | Brace PDF (3-page, ASCII-only) | `src/utils/bracePdfExport.ts` (NEW), `components/BraceResultsPanel.tsx` |
| **6I1** | — | Integration QA — all four items, browser + PDF evidence | read-only |

### Dependency graph

```
6R0 → 6R1 → 6R2 → 6R3 → 6R4 → 6R5 → 6I1
```

- **6R0 first** — CSS only, zero risk, disjoint from logic.
- **6R1** — self-contained beam rework; no dependency on brace work.
- **6R2 → 6R3** — column collapsible is no-new-computation (reads existing `ColumnIntermediates`);
  done before the brace so the brace can clone a working on-screen calc block.
- **6R3 → 6R4 → 6R5** — strictly sequential: `BraceInputs`/`BraceResults`/`evaluateBrace` and ψc
  must exist before components import them; `BraceResults` shape must be final before the PDF
  consumes it.
- One card IN_PROGRESS at a time. No worktrees (Rev 2–5 precedent).

---

## 2. Execution Model

Sequential single-track execution on `main`, **pull-based** through the kanban columns, with three
dedicated subagent roles per card. Each card is gated by `npx tsc --noEmit` (0 errors) +
`npm run build` (clean) + **Critic** spec review + **Validator** browser-MCP visual confirmation,
and is committed before the next card starts.

```
BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE   (or → BLOCKED)
            │         │              │            │
        Implementer Implementer    Critic     Validator
```

---

## 3. Kanban Board (`.nova/KANBAN.md` — replace file with)

```markdown
# Rev 6 Kanban Board — Steel Beam Design Tool

Pull model: BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE (or BLOCKED).
Execution mode: single-track sequential on `main`. Plan: `.nova/REV6-ORCHESTRATION-PLAN.md`.
Roles: Implementer → Critic (spec review) → Validator (browser-MCP visual confirmation).

| Card | Title | Column | Branch | Commit |
|------|-------|--------|--------|--------|
| 6R0 | Grey->cream helper text (McVeigh, all tabs) — Item 4 | READY | (main) | — |
| 6R1 | Beam top/bottom flange restraints + governing-segment LTB — Item 1 | BACKLOG | (main) | — |
| 6R2 | Column "Show calculations" collapsible — Item 3 | BACKLOG | (main) | — |
| 6R3 | Brace types + engine + psi_c — Item 2 | BACKLOG | (main) | — |
| 6R4 | Brace UI + hook + tab + graphs + collapsible — Item 2/3 | BACKLOG | (main) | — |
| 6R5 | Brace PDF (3-page ASCII) — Item 2 | BACKLOG | (main) | — |
| 6I1 | Integration QA — all four items, browser + PDF evidence | BACKLOG | (main) | — |

6R1 -> READY when 6R0 DONE; 6R2 when 6R1 DONE; 6R3 when 6R2 DONE; 6R4 when 6R3 DONE;
6R5 when 6R4 DONE; 6I1 when 6R5 DONE.
```

---

## 4. Agent Roles

### Implementer
**Pull condition:** card is READY.
**Must:** work directly on `main` (no worktrees); implement the card's steps per HANDOVER.md
exactly (decisions final); reuse the existing functions named in the card rather than re-implement;
run `npx tsc --noEmit` + `npm run build` in `steel-beam-tool/` and confirm clean before moving the
card to CRITIC_REVIEW; record the commit hash in the card STATUS block.
**Must NOT:** modify files outside the card's Files Owned; use `any`/`@ts-ignore`; add npm packages;
remove or rename existing exported interfaces/functions (extend, don't replace).
**Commit format:** `rev6(6RX): <present-tense summary>`.

### Critic *(subagent — confirms the issue was resolved correctly, in code)*
**Pull condition:** card is CRITIC_REVIEW with a commit hash recorded.
**Task:** review the diff against HANDOVER.md and the card's Critic Checklist. Emit **APPROVED** or
**CHANGES_REQUESTED** with specific file + line defects. **Never implements fixes** — reports only.
**Checklist (every card):** (1) Scope — only Files Owned touched; (2) Spec conformance — every
HANDOVER sub-item for the card addressed; (3) TS hygiene — no `any`/`@ts-ignore`/unused imports;
(4) Non-clobber — no prior behaviour removed, interfaces extended not replaced; (5) Defaults —
new inputs default to spec values (top/bottom counts → 0; brace → CHS/C350; deflection limit → 360);
(6) card-specific checks.
**Cycle limit:** max 2 CHANGES_REQUESTED cycles → else BLOCKED + escalate to engineer.

### Validator *(subagent — confirms the issue is resolved, visually, via browser MCP)*
**Pull condition:** card is QA with APPROVED in STATUS.
**Step 1 — automated gates:** run `npx tsc --noEmit` then `npm run build`. Any failure → return to
IN_PROGRESS with exact error output.
**Step 2 — browser-MCP visual confirmation (REQUIRED, every card):** ensure dev server is up
(`npm run dev` in `steel-beam-tool/` if needed), then execute the card's *Visual confirmation
steps* using Playwright MCP. Confirm the user-visible issue is actually resolved (not just that
code compiles). Save screenshots to `.nova/evidence/rev6/` and record filenames in STATUS Evidence.
Playwright MCP tools: `mcp__playwright__browser_navigate`, `browser_snapshot`,
`browser_take_screenshot`, `browser_click`, `browser_type`, `browser_fill_form`,
`browser_select_option`, `browser_wait_for`.
**On PASS:** move card to DONE, update KANBAN.md commit cell + column. **On FAIL:** return to
IN_PROGRESS with annotated screenshot path + defect. 2 failures on a card → BLOCKED + escalate.

---

## 5. Card Templates (create under `.nova/cards/`)

> Each card file starts with this STATUS block:
> ```
> ## STATUS
> - Column: <state>
> - Agent: (unassigned)
> - Critic verdict: (pending)
> - Validator result: (pending)
> - Evidence: (pending)
> ```

### `.nova/cards/6R0.md` — Grey→cream helper text (Item 4)

**Files owned:** `src/index.css`; the panel components carrying the flagged grey text
(`ResultsPanel.tsx`, `ColumnResultsPanel.tsx`; Brace panel inherits the same class once it exists).

**Implementation steps:**
1. Add a theme-aware utility class (surgical, class-based so it cannot bleed onto white backgrounds):
   ```css
   .mc-subtle { color: #4b5563; }                 /* == Tailwind gray-600, Light theme unchanged */
   [data-theme="mcveigh"] .mc-subtle { color: var(--mc-cream); }
   ```
2. On the flagged grey-on-green elements only, **replace** `text-gray-500`/`text-gray-600` with
   `mc-subtle`: the "Section class: … · fy = … · Le = …" summary line, the deflection-limit
   labels, and panel-level captions (beam `ResultsPanel.tsx` ≈L191–195 + L315–344; column
   `ColumnResultsPanel.tsx` ≈L155 summary line + any caption).
3. **Do NOT** touch: the "Show calculations" box body/italic notes, results-table cells, or
   Recharts axis/legend text — these sit on white and must stay dark (existing
   `[data-theme="mcveigh"] .recharts-* { fill:#333 !important }` stays).

**Critic checklist:** `.mc-subtle` defined with Light default `#4b5563` + McVeigh `var(--mc-cream)`;
only grey-on-green elements reclassed; no white-bg text reclassed; rule scoped to
`[data-theme="mcveigh"]` (Light theme byte-identical); no other CSS rules modified.

**Visual confirmation (Validator, browser-MCP):** switch to McVeigh theme; screenshot beam results
panel (`6R0-beam-mcveigh.png`) and column results panel (`6R0-column-mcveigh.png`) — confirm summary
line + deflection labels render **cream/legible** on green; confirm calc-box body, table cells, and
Recharts axis/legend text remain **dark/legible** on white; switch to Light theme, screenshot
(`6R0-light-unchanged.png`) — confirm grey-on-white unchanged.

---

### `.nova/cards/6R1.md` — Beam top/bottom flange restraints + governing-segment LTB (Item 1)

**Files owned:** `src/types/index.ts`, `engineering/as4100/effectiveLength.ts`,
`engineering/evaluate.ts`, `components/RestraintPanel.tsx`, `components/ResultsPanel.tsx`,
`utils/pdfExport.ts`, `src/App.tsx`.

**Data model (clean break — no migration shim):**
- In `RestraintConfig`, **replace** `intermediate: number[]` with `intermediateTop: number[]` and
  `intermediateBottom: number[]`.
- `App.tsx` initial `RestraintConfig`: both default to `[]`. αm override stays a single global
  value applied to the governing segment.

**RestraintPanel.tsx:** in Advanced mode only, replace the single "Number of intermediate
restraints" spinner with **two** count spinners — "Top flange — number of intermediate restraints"
and "Bottom flange — number of intermediate restraints" — each reproducing the existing
auto-evenly-spaced positioning independently (count N → positions `span/(N+1)·i`). Simple mode
unchanged. No per-position table, no continuous-restraint checkbox.

**Governing-segment LTB algorithm (effectiveLength.ts + evaluate.ts) — the engineering core:**
1. Use the factored BMD (`factored.bmd`). Sign convention: M > 0 = sagging = **top** flange in
   compression; M < 0 = hogging = **bottom** flange in compression.
2. **Top-flange pass** (governs sagging): restraint points = `{0, span} ∪ intermediateTop`.
   Form segments between consecutive points. A segment is evaluated **only if its compression
   flange is the top flange** — determined by the sign of the maximum-magnitude moment within the
   segment (positive ⇒ top governs that segment).
3. **Bottom-flange pass** (governs hogging): restraint points = `{0, span} ∪ intermediateBottom`.
   A segment is evaluated only if its peak-|M| is negative (bottom flange in compression).
4. For **each** evaluated segment compute: its `Le` (reuse the existing end-pair multiplier logic —
   interior restraint points act as 'F', the span ends use `endA`/`endB`), its `αm` via
   `calcAlphaM(bmd, segStart, segEnd)`, then `φMbx` via `calcMemberCapacity(section, fy, Le*1000,
   αm)`.
5. **Governing segment = lowest φMbx** across both passes (NOT the longest). Return its `Le`, `αm`,
   `αs`, and `start–end` position.
6. Apply the global αm override (if set) to the governing segment, as today.
7. **PP plain-sagging consequence:** with no hogging regions, every bottom-flange segment's peak
   moment is sagging ⇒ skipped ⇒ bottom-flange restraints have **no effect** on Le. Emit a
   one-line note in the calc section so this reads as intended, not a bug.

**evaluate.ts:** replace the single whole-span `calcEffectiveLength` + `calcAlphaM(bmd,0,span)` call
with the governing-segment routine; store governing `Le`, `αm`, `αs`, and segment range in
`intermediates`.

**ResultsPanel.tsx:** display the **governing segment's** Le, αm, αs and its start–end position
("which bay drives the check"); add the PP "bottom-flange restraints carry no compression here" note
in the calc collapsible. Keep the existing collapsible structure.

**pdfExport.ts:** calc sheet reflects the governing segment (Le/αm/αs + segment range + the
sagging note).

**Critic checklist:** `intermediate` fully replaced by `intermediateTop`+`intermediateBottom`
(no `intermediate` references remain); both default `[]`; Simple mode untouched; two independent
count spinners (Advanced only); compression flange per segment from BMD sign; governing = **min
φMbx** not max length; results show governing segment range + Le/αm/αs; PP note present; αm override
applied to governing segment; no `any`/`@ts-ignore`; no npm packages.

**Visual confirmation (Validator, browser-MCP):**
1. PP sagging beam (e.g. 360UB44.7, 8 m, 20 kN/m G): add **bottom-flange** restraints → confirm Le
   and φMbx **unchanged** + the no-effect note shows (`6R1-pp-bottom-noeffect.png`). Add
   **top-flange** restraints → confirm Le **drops** and φMbx **rises** (`6R1-pp-top-effect.png`).
2. FF beam with hogging ends: add **bottom-flange** restraints near the ends → confirm a
   hogging-zone bottom-flange segment **governs** (`6R1-ff-bottom-governs.png`).
3. Confirm the reported governing segment is the **lowest-φMbx** one, not merely the longest
   (`6R1-governing-segment.png`). Export PDF — confirm calc sheet shows governing segment + note
   (`6R1-pdf-calc.png`).

---

### `.nova/cards/6R2.md` — Column "Show calculations" collapsible (Item 3)

**Files owned:** `src/components/ColumnResultsPanel.tsx`.

**Implementation steps:** add the same "Show calculations ▾/▴" collapsible the beam has — monospace
block, formula → substituted values → result, AS-clause tags — reading the already-computed
`ColumnIntermediates` (no new computation). Cover: section classification (Cl. 5.2.2); axial
section φNs (Cl. 6.2); member buckling φNc x & y with λn / αc (Cl. 6.3.3); bending φMs / φMb
(Cl. 5); combined Cl. 8.3.3 / 8.4.2 / 8.4.4. **Keep the existing column PDF calc sheet** and make
the on-screen text **read identically** to it. New grey captions added here use `.mc-subtle` from
6R0 if on the green panel (calc-box body stays dark on white).

**Critic checklist:** collapsible mirrors the beam's structure/styling; content matches the column
PDF calc sheet line-for-line; reads existing `ColumnIntermediates` (no new calc); all listed AS
clauses tagged; calc-box body stays dark on white; no `any`/`@ts-ignore`.

**Visual confirmation (Validator, browser-MCP):** Column tab, configure a UC with axial + moment;
expand "Show calculations" (`6R2-column-calc-open.png`) — confirm substituted values **match the
results table**; export column PDF and confirm the on-screen text matches the PDF calc sheet
(`6R2-column-pdf-calc.png`); collapse/expand toggles correctly.

---

### `.nova/cards/6R3.md` — Brace types + engine + ψc (Item 2, engine)

**Files owned:** `src/types/brace.ts` (NEW), `engineering/as4100/braceCapacity.ts` (NEW),
`engineering/as1170/psiFactors.ts`.

**psiFactors.ts:** add `getPsiC(type)` / `PSI_C_FACTORS` for the short-term combination factor ψc
(AS1170.0 Table 4.1), alongside the existing ψl. Reuse the existing `LiveLoadType` list. Values per
Table 4.1 (verify against the engineer's reference for any ambiguous category — see §8).

**types/brace.ts:** define `BraceInputs` and `BraceResults`/`BraceIntermediates`. `BraceInputs`
includes: span L (m); section type (CHS/SHS/RHS) + hollow grade (C250/C350/C450, default CHS/C350);
`kx`, `ky` (default 1.0); axial `nStar` (single already-factored ultimate value, applied in every
combo); transverse point loads array (each: position m, magnitude kN, tag G/Q/Wind — Wind signed,
+down/−up); live-load category (drives ψc/ψl); deflection limit denominator (default 360).
`BraceResults` mirrors `ColumnResults` (φNs, φNcX/Y/φNc, φMsx, φMbx=φMsx, the three combined ratios)
plus: governing M* and its combo, the BMD array, the self-weight deflection profile + δ and limit,
and a `BraceIntermediates` for the calc sheet.

**braceCapacity.ts:** `evaluateBrace(inputs): BraceResults`.
- **Axial:** reuse the Column engine's path — `calcFyHollow`, `calcAlphaC`, rx=√(Ix/Ag),
  ry=√(Iy/Ag), Le_x=kx·L, Le_y=ky·L → φNcX, φNcY, φNc = min. φNs as in column. (Reuse
  `evaluateColumn` internals where cleanly importable; otherwise replicate the hollow-section path.)
- **Bending (major axis only):** self-weight UDL via `calcSelfWeightKnPerM` (G action) + transverse
  point loads. Compute M* for each combo and take **worst |M*|**:
  1. `1.2G + 1.5Q`  2. `1.2G + Wu + ψc·Q`  3. `0.9G + Wu` (uplift).
  Produce the BMD for the governing combo. (Reuse the beam's superposition logic in
  `loadCombinations.ts` if cleanly importable; else a focused simply-supported point-load + UDL
  Mmax/BMD helper.) M*y = 0.
- **Capacity:** closed section ⇒ φMbx = φMsx (no LTB; emit "no LTB — closed section" note).
- **Combined:** Cl. 8.3.3 / 8.4.2 / 8.4.4 reusing the Column formulas with M*y = 0.
- **Deflection:** self-weight only (bare-member sag), simply-supported UDL profile; compare δ to
  L/limit (default 360).

**Critic checklist:** ψc added (Table 4.1) without altering ψl; `BraceInputs`/`BraceResults` defined;
default CHS/C350, limit 360; single factored N* applied in all combos; bending = self-weight +
point loads, worst of the 3 combos; φMbx = φMsx (no LTB); combined ratios reuse column Cl. 8.3/8.4;
deflection from self-weight only; reuses `calcFyHollow`/`calcAlphaC`/`calcSelfWeightKnPerM`/section
DB rather than duplicating; no `any`/`@ts-ignore`; no npm packages.

**Verification (no browser — pure logic):** hand-calc spot-check a CHS (known N*, self-weight + one
Q point load + one Wind uplift load) → reproduce N*, governing M* + combo, φNcX/φNcY, the Cl. 8.3/8.4
ratios, and the L/360 deflection. Record in the card History block.

---

### `.nova/cards/6R4.md` — Brace UI + hook + tab + graphs + collapsible (Item 2 UI + Item 3 Brace)

**Files owned:** `src/BraceApp.tsx` (NEW), `components/BraceGeometryPanel.tsx` /
`BraceLoadPanel.tsx` / `BraceResultsPanel.tsx` (NEW), `hooks/useBraceCalculations.ts` (NEW),
`src/App.tsx`.

**Implementation steps:**
- `useBraceCalculations`: `useMemo(() => evaluateBrace(inputs), [inputs])` (mirror
  `useColumnCalculations`).
- `App.tsx`: extend `activeTab` union to `'beam' | 'column' | 'brace'`; nav order
  **Steel Beam | Steel Column | Steel Brace**; mount `<BraceApp>` always, `hidden` when inactive;
  thread `jobNumber`/`jobName` (same as Column). JSON Save/Load stays beam-only (Brace excluded —
  see §8).
- `BraceGeometryPanel`: span L; section type CHS/SHS/RHS; grade C250/C350/C450 (default CHS/C350);
  section size dropdown (`getSectionsByType`); `kx`, `ky` (default 1.0); read-only Le_x/Le_y.
  **Auto-lightest button** (under the size dropdown) — DEVIATION from beam/column: searches the
  **full matrix {CHS,SHS,RHS} × {C250,C350,C450}**, selects the **global lightest passing** section
  and sets type + grade + size.
- `BraceLoadPanel`: axial `N*` input; transverse point-load editor (position, magnitude, tag
  G/Q/Wind; Wind signed); read-only self-weight UDL row; live-load category dropdown (reuse the
  beam's list → ψc/ψl); deflection-limit field (default 360).
- `BraceResultsPanel`: PASS/FAIL banner; check table (axial section φNs, axial member x & y φNc,
  bending φMs, combined Cl. 8.3.3 / 8.4.2 / 8.4.4, self-weight deflection); section-class summary
  line (use `.mc-subtle`); **"Show calculations" collapsible** (Item 3 for the brace — section
  class; φNc x & y; φMs with "no LTB — closed section" note; the 3 combos → governing M*; combined
  interaction; deflection vs L/limit); the **three graphs** (clone the column's inline Recharts
  pattern): (1) **N–M interaction** — design point (M*, N*) vs section envelope (φNs/φMsx) and member
  envelope (φNc/φMbx); (2) **BMD** of the governing combo; (3) **deflection profile** (self-weight)
  with the L/limit reference line. **Export PDF** button (wired in 6R5; disabled stub here).

**Critic checklist:** tab order Beam|Column|Brace; all three tabs always mounted (CSS hidden);
default CHS/C350; auto-lightest searches all 3 types × 3 grades and sets type+grade+size; Wind
signed; self-weight read-only row; live-load dropdown drives ψc; deflection limit editable
default 360; three graphs render; brace collapsible matches the PDF calc content; PDF button stubbed;
beam/column tabs unaffected; no `any`/`@ts-ignore`; no npm packages.

**Visual confirmation (Validator, browser-MCP):** click Steel Brace tab — full UI, not stub
(`6R4-brace-default.png`); configure a CHS with N*, self-weight + one Q + one Wind-uplift point
load; confirm PASS/FAIL banner + full check table (`6R4-brace-results.png`); confirm all three
graphs render — interaction with design point, BMD, deflection with reference line
(`6R4-brace-graphs.png`); click Auto-lightest → confirm it returns the **global** lightest across
all types/grades and sets type+grade+size (`6R4-brace-autolightest.png`); expand "Show calculations"
→ values match the table (`6R4-brace-calc.png`); switch Beam/Column tabs → confirm their state
preserved (`6R4-tab-state.png`).

---

### `.nova/cards/6R5.md` — Brace PDF (Item 2, PDF)

**Files owned:** `src/utils/bracePdfExport.ts` (NEW), `components/BraceResultsPanel.tsx` (wire PDF
button only).

**Implementation steps:** 3-page A4 jsPDF export, **ASCII-only** (helvetica can't render φ/λ/ψ — use
"phi"/"lambda"/"psi"/"sqrt"/"<="; established column convention), `y > 270` overflow guard. Page 1:
inputs + check table. Page 2: graphs (interaction + BMD + deflection, drawn with jsPDF lines, no
external chart lib). Page 3: calc sheet with AS-clause tags, **reading identically** to the on-screen
brace collapsible. Use shared `buildFilename(jobNumber, jobName, 'pdf')`; receive jobNumber/jobName
from `App` (as Column does). Wire the Export PDF button in `BraceResultsPanel`.

**Critic checklist:** new file; `pdfExport.ts`/`columnPdfExport.ts` untouched; ASCII-only (no
φ/λ/ψ/²/√/≤); overflow guard present; 3 pages with the specified content; graphs drawn with jsPDF
lines; uses `buildFilename`; calc sheet matches on-screen collapsible; only the PDF button wired in
the panel.

**Visual confirmation (Validator, browser-MCP):** configure a brace, click Export PDF → confirm
download; screenshot the 3 pages (`6R5-pdf-page1/2/3.png`) — page 1 inputs+table, page 2 three
graphs with design point + reference line, page 3 calc sheet ASCII-only with AS-clause tags; confirm
page-3 text matches the on-screen collapsible; beam + column PDF regression unaffected
(`6R5-regression.png`).

---

### `.nova/cards/6I1.md` — Integration QA (all four items)

**Read-only — no code changes.** Final end-to-end confirmation of every HANDOVER verification gate
in one session.

**Gates:** `npx tsc --noEmit` 0 errors; `npm run build` clean; then browser-MCP confirmation of each
item's spot-checks:
- **Item 1:** PP sagging beam — bottom-flange restraints no effect on Le; top-flange restraints
  reduce Le + raise φMbx. FF beam — bottom-flange restraints govern at the hogging ends. Governing
  segment reported is lowest-φMbx, not longest.
- **Item 2:** hand-calc beam-column spot-check (a CHS, known N*, self-weight + one Q + one Wind
  uplift) reproducing N*, governing M*, φNc x/y, Cl. 8.3/8.4 ratios, L/360 deflection; auto-lightest
  returns the global lightest across all three types and grades; all three graphs render; 3-page PDF.
- **Item 3:** Column + Brace collapsibles expand/collapse; substituted values match the results
  table and the PDF calc sheet.
- **Item 4:** McVeigh theme — panel summary lines cream/legible; calc-box, table, chart text stay
  dark/legible; Light theme unchanged.

Save all screenshots to `.nova/evidence/rev6/`; record paths in STATUS Evidence.

---

## 6. End-to-End Verification (after 6I1)

1. `npx tsc --noEmit` → 0 errors; `npm run build` → clean.
2. Beam: top/bottom restraint count fields (Advanced); PP bottom-flange = no effect (+ note);
   top-flange reduces Le/raises φMbx; FF bottom-flange governs hogging; governing = min-φMbx with
   reported segment range.
3. Column: "Show calculations" collapsible matches the PDF calc sheet.
4. Brace: full tab (Beam|Column|Brace order, state preserved); engine matches hand-calc; auto-lightest
   global across 3 types × 3 grades; 3 graphs; collapsible; 3-page ASCII PDF.
5. McVeigh: summary/label text cream on green; white-bg text + Recharts stay dark; Light theme
   unchanged.
6. No new npm packages; beam + column PDFs regress clean.

---

## 7. Journal Entry to Append (`journal.md`)

```markdown
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

### Open items flagged to engineer (see plan §8)
JSON Save/Load stays beam-only (Brace excluded) - confirm. psi_c values vs AS1170.0 Table 4.1 for
any ambiguous live-load category - confirm.
```

---

## 8. Open Items / Assumptions (flag to engineer; do not block planning)

- **JSON Save/Load stays beam-only.** Export/Import serialises only the beam `DesignInputs` (Column
  already excluded); the Brace is assumed likewise excluded. Flag if cross-tab save/load is wanted.
- **ψc values** taken from AS1170.0 Table 4.1; confirm the exact ψc per live-load category for any
  ambiguous category against the engineer's reference before 6R3 closes.
- **Brace section properties** confirmed present in the DB (Ag, Ix, Iy, Sx, Zx, J; Iw/LTB not needed
  for closed sections) — verified during exploration.
- **No new npm packages** (consistent with all prior revs).

---

## 9. Critical Non-Clobber Rules

- `types/index.ts`: `RestraintConfig.intermediate` is intentionally **replaced** by
  `intermediateTop`+`intermediateBottom` (Rev 6 clean break) — every other type left intact.
- `effectiveLength.ts`: reuse `calcAlphaM` and the end-pair multiplier logic; do not delete them.
- `evaluate.ts`, `momentCapacity.ts`, `compressionCapacity.ts`, `columnCapacity.ts`: brace work
  **imports/reuses** (`calcAlphaC`, `calcFyHollow`, `calcMemberCapacity`, `calcSelfWeightKnPerM`,
  `buildFilename`); never modifies their signatures.
- `psiFactors.ts`: `getPsiC` is additive — existing `getPsiL`/`PSI_L_FACTORS` unchanged.
- `App.tsx`: only the `activeTab` union, nav, and a mounted `<BraceApp>` change; beam/column layout
  and state untouched.
- `pdfExport.ts` / `columnPdfExport.ts`: untouched by the brace PDF (new `bracePdfExport.ts`).
- `index.css`: only the additive `.mc-subtle` rules; existing theme + Recharts rules unchanged.
