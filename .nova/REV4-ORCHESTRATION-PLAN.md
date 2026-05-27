# Rev 4 Orchestration Plan — McVeigh Steel Designer

## Context

The handover document at `.Improvements\Rev 4\HANDOVER.md` specifies 8 improvements to the
McVeigh Steel Designer app (React 18 + TypeScript + Vite, `steel-beam-tool/`, dev server at
`localhost:5173`). All decisions are final — confirmed with the engineer during a design interview
on 2026-05-27.

Items span three categories:
- **Engineering additions** (Items 1, 2): fixed support conditions; beam-column combined actions
- **UI/output expansion** (Items 3, 4, 5): expanded calc working in Results panel; job metadata;
  save/load JSON file
- **Polish** (Items 6, 7, 8): McVeigh theme text contrast; dynamic deflection label; Grade 350 steel

File conflicts make **sequential execution on `main`** the only viable model (consistent with Rev 2
and Rev 3 precedent). `types/index.ts` is touched by Items 1, 2, and 8; `evaluate.ts` by Items 1,
2, and 8; `pdfExport.ts` by Items 1, 2, and 4. Parallel worktrees would require semantic merge
conflict resolution on logically coupled items.

Eight HANDOVER items collapse into **6 implementation cards** (4R0 → 4R5) and one integration card
(4I1), strictly sequential. Cards map directly to the HANDOVER's suggested sequencing.

---

## Planning Deliverables

These administrative setup tasks are performed as the first action after plan approval — before any
source code changes. They are NOT deferred to an implementation agent.

1. **Update `.nova/KANBAN.md`** — replace content with the Rev 4 board (see §Kanban Board below)
2. **Create card files** — `.nova/cards/4R0.md` through `.nova/cards/4I1.md` (7 files, see §Card Templates)
3. **Update `journal.md`** — append the Rev 4 Planning entry (see §Journal Entry)
4. **Save orchestration plan** — save this plan to `.nova/REV4-ORCHESTRATION-PLAN.md`

## Pre-execution Check (first action of the implementing agent for each card)

5. **Verify dev server** — confirm `npm run dev` is running at `localhost:5173` before any Test
   Validator browser-MCP work

---

## Card Grouping

| Card | Items | Title | Primary Files Owned |
|------|-------|-------|---------------------|
| **4R0** | 6, 7 | Polish — theme text + dynamic label | `src/index.css`, `src/components/ResultsPanel.tsx` (label only) |
| **4R1** | 8 | Steel grade dropdown | `src/types/index.ts`, `src/engineering/sections/sectionUtils.ts`, `src/engineering/evaluate.ts`, `src/engineering/sections/autoSelect.ts`, `src/components/GeometryPanel.tsx` |
| **4R2** | 4, 5 | Job metadata + save/load JSON | `src/App.tsx`, `src/utils/pdfExport.ts`, `src/components/ResultsPanel.tsx` |
| **4R3** | 1 | Fixed end support conditions | `src/types/index.ts`, `src/engineering/as1170/loadCombinations.ts`, `src/engineering/as4100/deflection.ts`, `src/components/GeometryPanel.tsx`, `src/components/RestraintPanel.tsx`, `src/engineering/evaluate.ts`, `src/utils/pdfExport.ts` |
| **4R4** | 2 | Axial compression + combined actions | `src/types/index.ts`, `src/engineering/as4100/compressionCapacity.ts` (NEW), `src/engineering/evaluate.ts`, `src/components/LoadPanel.tsx`, `src/components/ResultsPanel.tsx`, `src/utils/pdfExport.ts` |
| **4R5** | 3 | Expanded calculation working | `src/components/ResultsPanel.tsx` (collapsible section only) |
| **4I1** | — | Integration + final visual QA | reads only; no code changes |

### Dependency Graph

```
4R0 → 4R1 → 4R2 → 4R3 → 4R4 → 4R5 → 4I1
```

- **4R0 → 4R1**: 4R0 is risk-free polish; clears it first so subsequent type-layer cards start on
  a clean, visually-confirmed base.
- **4R1 → 4R2**: `types/index.ts` and `evaluate.ts` stable before 4R2 adds job-state fields.
- **4R2 → 4R3**: `App.tsx` and `pdfExport.ts` stable before 4R3 adds `supportCondition` to both.
- **4R3 → 4R4**: `DesignInputs` and `DesignIntermediates` must be stable before adding
  compression types; `evaluate.ts` sequential to avoid merge conflicts.
- **4R4 → 4R5**: All `DesignIntermediates` fields (including compression fields) must exist before
  4R5 renders them in the expanded calc section.
- No parallel execution. Only one card IN_PROGRESS at any time.

---

## Kanban Board

**File:** `.nova/KANBAN.md`

Replace the file with:

```markdown
# Rev 4 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV4-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| 4R0 | Polish — theme text + dynamic label (Items 6+7) | READY | (main) |
| 4R1 | Steel grade dropdown (Item 8) | BACKLOG | (main) |
| 4R2 | Job metadata + save/load JSON (Items 4+5) | BACKLOG | (main) |
| 4R3 | Fixed end support conditions (Item 1) | BACKLOG | (main) |
| 4R4 | Axial compression + combined actions (Item 2) | BACKLOG | (main) |
| 4R5 | Expanded calculation working (Item 3) | BACKLOG | (main) |
| 4I1 | Integration — verification + final visual QA | BACKLOG | (main) |

4R1 → READY when 4R0 DONE. 4R2 → READY when 4R1 DONE. 4R3 → READY when 4R2 DONE.
4R4 → READY when 4R3 DONE. 4R5 → READY when 4R4 DONE. 4I1 → READY when 4R5 DONE.
```

---

## Agent Roles

### Implementer
**Pull condition:** Card is READY.
**Must:** Work directly on `main` branch (no worktrees). Implement per HANDOVER.md spec exactly
(all decisions final). Self-verify `npx tsc --noEmit` and `npm run build` in `steel-beam-tool/`
before moving card to CRITIC_REVIEW. Record commit hash in the card STATUS block.
**Must NOT:** Modify files outside Files Owned for the card. Use `any` or `@ts-ignore`. Install
new npm packages. Remove or rename existing interfaces or exported functions.
**Commit format:** `rev4(4RX): <present-tense description>`

### Critic
**Pull condition:** Card is CRITIC_REVIEW with a commit hash recorded.
**Task:** Review implementation against HANDOVER.md spec. Issue APPROVED or CHANGES_REQUESTED with
specific file + line defect descriptions. Never implements fixes — reports findings only.
**Review checklist (in order):**
1. **Scope** — only Files Owned for this card are modified; no unrelated files touched
2. **Spec conformance** — every HANDOVER.md sub-item for this card fully addressed
3. **TypeScript hygiene** — no `any`, no `@ts-ignore`, no unused imports added, no suppressions
4. **Non-clobber** — no prior enhancements removed; existing interfaces extended, not replaced
5. **Card-specific checks** — see each card's Critic Checklist section
6. **Default state** — all new inputs default to backwards-compatible values
**Cycle limit:** Max 2 CHANGES_REQUESTED cycles. Cycle-2 failure → BLOCKED, escalate to user.

### Test Validator
**Pull condition:** Card is QA with APPROVED in STATUS block.
**Step 1 — Automated gates:** Run `npx tsc --noEmit` then `npm run build` in `steel-beam-tool/`.
Any failure → return card to IN_PROGRESS with exact error output.
**Step 2 — Browser visual confirmation (required for every card):** Use Playwright MCP to
visually confirm each gate per the Visual Confirmation Steps in the card file. Record screenshot
filenames in STATUS Evidence block.
Playwright MCP tools available: `mcp__playwright__browser_navigate`,
`mcp__playwright__browser_fill_form`, `mcp__playwright__browser_take_screenshot`,
`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_click`,
`mcp__playwright__browser_select_option`, `mcp__playwright__browser_type`.
**On PASS (all steps green):** Move card to DONE. Record evidence in STATUS block. Update KANBAN.md.
**On FAIL (any step):** Return card to IN_PROGRESS with annotated screenshot path + defect
description. After 2 failures on the same card → BLOCKED, escalate to user.

---

## Card Templates

---

### `.nova/cards/4R0.md` — Polish: theme text + dynamic label (Items 6+7)

```markdown
# 4R0 — Polish: theme text + dynamic label (Items 6+7)

## STATUS
- Column: READY
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 6 — Dark text on light backgrounds (McVeigh theme input fix)
- HANDOVER Item 7 — Dynamic deflection label (G+{psiL}Q)

## Files owned
- `src/index.css`
- `src/components/ResultsPanel.tsx` (label string only — one line change)

## Implementation steps

### Item 6 — index.css
Add one CSS rule block at the end of the McVeigh theme section:

```css
[data-theme="mcveigh"] input,
[data-theme="mcveigh"] textarea,
[data-theme="mcveigh"] select option {
  color: #111;
  background-color: #ffffff;
}
```

Do NOT modify any other existing CSS rules.

### Item 7 — ResultsPanel.tsx
Locate the hardcoded deflection row label string `"G+Q deflection limit: span /"` (or equivalent).
Replace with a dynamic expression that reads `results.intermediates.psiL`:

```tsx
`G+${results.intermediates.psiL}Q deflection limit: span /`
```

(The exact surrounding JSX may vary — find the hardcoded string and replace only the label text.)

## Critic checklist (card-specific)
- CSS rule uses `[data-theme="mcveigh"]` attribute selector (not a class)
- Covers `input`, `textarea`, AND `select option` — all three selectors present
- `color: #111` (not black — spec says dark, not pure black; any near-black is acceptable)
- `background-color: #ffffff` on inputs
- No other CSS rules modified
- ResultsPanel.tsx: only the label string changed; no structural JSX changes
- Dynamic label reads `results.intermediates.psiL` (already present from Rev 3 3R3)
- Label format: `G+{psiL}Q` — exactly matches HANDOVER examples (e.g. "G+0.4Q", "G+0.6Q", "G+0Q")

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Switch to McVeigh theme using the theme dropdown in the header.
3. Take full-page screenshot — confirm input fields (span, loads, restraints) show DARK text on
   white/light backgrounds. Cream-on-white invisible text would be a failure.
4. Zoom into the Loads panel: confirm line load magnitude fields, point load fields, and all
   number inputs have clearly readable dark text.
5. Take screenshot of the Load panel inputs (McVeigh theme active).
6. In the Load panel, change Live Load Category to "Storage" (ψ_l = 0.6).
7. In the Results panel, locate the deflection row label. Take screenshot — confirm it now reads
   `G+0.6Q deflection limit: span /` (not the old hardcoded `G+Q`).
8. Change Live Load Category to "Roof (other)" (ψ_l = 0.0). Take screenshot — confirm label reads
   `G+0Q deflection limit: span /`.
9. Change Live Load Category back to "Office" (ψ_l = 0.4). Confirm `G+0.4Q`.

## History
(append-only — add entries as work progresses)
```

---

### `.nova/cards/4R1.md` — Steel grade dropdown (Item 8)

```markdown
# 4R1 — Steel grade dropdown (Item 8)

## STATUS
- Column: BACKLOG (becomes READY when 4R0 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 8 — Grade 300 / Grade 350 steel grade selection

## Files owned
- `src/types/index.ts`
- `src/engineering/sections/sectionUtils.ts`
- `src/engineering/evaluate.ts`
- `src/engineering/sections/autoSelect.ts`
- `src/components/GeometryPanel.tsx`

## Type additions (types/index.ts)

```typescript
export type SteelGrade = 'G300' | 'G350';

// Add to DesignInputs:
steelGrade: SteelGrade;   // default: 'G300'
```

## sectionUtils.ts — update calcFy

Current signature: `calcFy(section: SteelSection): number`
New signature: `calcFy(section: SteelSection, grade: SteelGrade = 'G300'): number`

Grade 300 values (unchanged — existing logic):
- tf ≤ 17 mm → 300 MPa; tf > 17 mm → 280 MPa

Grade 350 values (new, AS3678):
- tf ≤ 11 mm → 360 MPa
- 11 < tf ≤ 17 mm → 340 MPa
- tf > 17 mm → 330 MPa

```typescript
export function calcFy(section: SteelSection, grade: SteelGrade = 'G300'): number {
  const tf = section.tf;
  if (grade === 'G350') {
    if (tf <= 11) return 360;
    if (tf <= 17) return 340;
    return 330;
  }
  // G300 (existing logic)
  return tf <= 17 ? 300 : 280;
}
```

## evaluate.ts
Change: `const fy = calcFy(section)` → `const fy = calcFy(section, inputs.steelGrade)`

## autoSelect.ts
Find the `calcFy` call site and pass `inputs.steelGrade` as the second argument.

## GeometryPanel.tsx
Add a "Steel Grade" dropdown below the Section type/size selects (before the auto-select button):

```tsx
<label>Steel Grade
  <select value={inputs.steelGrade} onChange={e => onChange({ steelGrade: e.target.value as SteelGrade })}>
    <option value="G300">Grade 300</option>
    <option value="G350">Grade 350</option>
  </select>
</label>
```

## App.tsx default state
Add `steelGrade: 'G300'` to the initial `DesignInputs` state object (App.tsx is NOT in this
card's Files Owned — but the Implementer must add this default. Record it in History if done as a
minimal exception.)

## Critic checklist (card-specific)
- `SteelGrade` type added to `types/index.ts`; `steelGrade` added to `DesignInputs`
- `calcFy` default parameter `grade = 'G300'` ensures all existing callers without the second
  argument continue to work (backwards-compatible)
- Grade 350 fy values match HANDOVER exactly: 360/340/330 MPa by tf thresholds
- Both `evaluate.ts` AND `autoSelect.ts` pass `inputs.steelGrade` to `calcFy`
- GeometryPanel.tsx renders the dropdown with exactly two options: Grade 300, Grade 350
- `steelGrade: 'G300'` added to App.tsx initial state

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Take screenshot of Geometry panel — confirm "Steel Grade" dropdown is visible.
3. Select section 200UB25.4, span 6m, a UDL G load of 10 kN/m. Note φMs and φMbx values.
4. Switch Steel Grade to "Grade 350". Take screenshot of Results panel — confirm φMs and φMbx
   values are HIGHER than with Grade 300 (fy increased from 300→360 MPa for standard UB tf).
5. Switch back to Grade 300 — confirm values return to prior figures.
6. Use "Auto-select lightest" with Grade 350 active — confirm the selected section reflects the
   new grade (may select a lighter section than Grade 300 would).
7. Take screenshot confirming the auto-select message and current φMs value.

## History
(append-only)
```

---

### `.nova/cards/4R2.md` — Job metadata + save/load JSON (Items 4+5)

```markdown
# 4R2 — Job metadata + save/load JSON (Items 4+5)

## STATUS
- Column: BACKLOG (becomes READY when 4R1 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 4 — Job Number and Job Name fields
- HANDOVER Item 5 — Save / Load JSON file (import/export)

## Files owned
- `src/App.tsx`
- `src/utils/pdfExport.ts`
- `src/components/ResultsPanel.tsx`

## App.tsx changes

### State additions
```typescript
const [jobNumber, setJobNumber] = useState('');
const [jobName, setJobName] = useState('');
```

### Layout — below header, above input panels
Row 1 — Job fields (full-width row):
```tsx
<div className="flex gap-4 px-4 py-2">
  <label>Job No:
    <input value={jobNumber} onChange={e => setJobNumber(e.target.value)} placeholder="e.g. J001" />
  </label>
  <label className="flex-1">Job Name:
    <input value={jobName} onChange={e => setJobName(e.target.value)} placeholder="e.g. Town Hall" />
  </label>
</div>
```

Row 2 — Import/Export buttons (full-width row, below Row 1):
```tsx
<div className="flex gap-2 px-4 py-2">
  <button onClick={handleImport}>↑ Import</button>
  <button onClick={handleExport}>↓ Export</button>
  <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
  {importMsg && <span>{importMsg}</span>}
</div>
```

### Export handler
```typescript
function handleExport() {
  const payload = { jobNumber, jobName, inputs };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildFilename(jobNumber, jobName, 'json');
  a.click();
  URL.revokeObjectURL(url);
}
```

### Import handler
```typescript
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  file.text().then(text => {
    try {
      const { jobNumber: jn, jobName: jnm, inputs: imp } = JSON.parse(text);
      setJobNumber(jn ?? '');
      setJobName(jnm ?? '');
      setInputs(imp);
      setImportMsg(`Loaded: ${file.name}`);
    } catch {
      setImportMsg('Invalid file — could not load.');
    }
  });
}
```

### Filename builder (utility function in App.tsx or a shared util)
```typescript
function buildFilename(jobNo: string, jobName: string, ext: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0,10).replace(/-/g,'');
  const hhmm = now.toTimeString().slice(0,5).replace(':','');
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '');
  const parts = [safe(jobNo), safe(jobName), `${date}_${hhmm}`].filter(Boolean);
  return `${parts.join('_')}.${ext}`;
}
```

### Pass jobNumber, jobName down to ResultsPanel
`<ResultsPanel ... jobNumber={jobNumber} jobName={jobName} />`

## ResultsPanel.tsx changes
Accept `jobNumber` and `jobName` as props. Pass them into the `exportToPDF` call.

## pdfExport.ts changes

### PdfExportArgs extension
```typescript
jobNumber?: string;
jobName?: string;
```

### Page 1 — add job metadata block at top (before existing inputs section)
Immediately after the header block, before the inputs section:
```typescript
if (args.jobNumber || args.jobName) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (args.jobNumber) { doc.text(`Job No:    ${args.jobNumber}`, 10, y); y += lineH; }
  if (args.jobName)   { doc.text(`Job Name:  ${args.jobName}`,   10, y); y += lineH; }
  y += 2; // small gap before inputs section
}
```

### PDF filename
Update the filename in the `exportToPDF` function to use `buildFilename` (or inline the same
logic): `[JobNo]_[JobName]_YYYYMMDD_HHMM.pdf`. Strip to `[A-Za-z0-9_-]`.

## Critic checklist (card-specific)
- `jobNumber` and `jobName` are React state in App.tsx (`useState('')`); no localStorage
- Both fields reset to empty on page load (stateless — confirmed by `useState('')`)
- Import restores `jobNumber`, `jobName`, AND all `DesignInputs` into app state
- Import success: inline message "Loaded: {filename}"
- Import failure: inline message "Invalid file — could not load."
- Export JSON structure: `{ jobNumber, jobName, inputs: DesignInputs }` exactly
- Filename: `[JobNo]_[JobName]_YYYYMMDD_HHMM.{ext}` — blank parts omitted, no double underscore
- Filename safe-chars: only `[A-Za-z0-9_-]` after stripping
- PDF page 1 shows job block ONLY when at least one field is non-blank; blank fields omitted
- `pdfExport.ts`: ONLY page 1 job block + filename logic changed; page 2 and page 3 unchanged
- `ResultsPanel.tsx`: ONLY the exportToPDF call site updated to pass new props

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Take screenshot — confirm Job No and Job Name fields visible below header, above input panels.
3. Confirm Import/Export buttons visible in the row below the job fields.
4. Enter Job No = "J001", Job Name = "Town Hall". Configure a beam (e.g. 360UB44.7, 8m span,
   20 kN/m G load). Click "↓ Export" button.
5. Confirm a .json file downloads. Confirm filename is `J001_TownHall_YYYYMMDD_HHMM.json`.
6. Reload the page. Confirm job fields are empty (stateless — no persistence).
7. Click "↑ Import". Select the previously downloaded JSON file.
8. Take screenshot — confirm "Loaded: {filename}" message appears.
9. Confirm Job No, Job Name, and all input fields restored to pre-reload values.
10. Click "Export PDF Report". Confirm downloaded PDF filename is
    `J001_TownHall_YYYYMMDD_HHMM.pdf`.
11. Open the PDF. Take screenshot of page 1 — confirm "Job No: J001" and "Job Name: Town Hall"
    lines appear at the top of page 1 before the inputs section.
12. Test blank fields: reload, export PDF with no job data — confirm filename is `YYYYMMDD_HHMM.pdf`
    (no leading underscores) and page 1 has no job block.

## History
(append-only)
```

---

### `.nova/cards/4R3.md` — Fixed end support conditions (Item 1)

```markdown
# 4R3 — Fixed end support conditions (Item 1)

## STATUS
- Column: BACKLOG (becomes READY when 4R2 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 1 — Fixed end support conditions (PP / FP / PF / FF)

## Files owned
- `src/types/index.ts`
- `src/engineering/as1170/loadCombinations.ts`
- `src/engineering/as4100/deflection.ts`
- `src/components/GeometryPanel.tsx`
- `src/components/RestraintPanel.tsx`
- `src/engineering/evaluate.ts`
- `src/utils/pdfExport.ts`

## Type additions (types/index.ts)

```typescript
export type SupportCondition = 'PP' | 'FP' | 'PF' | 'FF';

// Add to DesignInputs:
supportCondition: SupportCondition;   // default: 'PP'
```

Add `supportCondition: 'PP'` to App.tsx initial state (minimal exception; record in History).

## GeometryPanel.tsx — Support Conditions dropdown

Add dropdown below the Span field:

```tsx
<label>Support Conditions
  <select value={inputs.supportCondition} onChange={e => onChange({ supportCondition: e.target.value as SupportCondition })}>
    <option value="PP">Pin–Pin (default)</option>
    <option value="FP">Fixed–Pin (End A fixed, End B pin)</option>
    <option value="PF">Pin–Fixed (End A pin, End B fixed)</option>
    <option value="FF">Fixed–Fixed</option>
  </select>
</label>
```

## RestraintPanel.tsx — lock/unlock logic

On `supportCondition` change:
- `FP` or `FF` (End A fixed): switch to Advanced mode, set `restraint.endA = 'F'`, grey out + disable the End A select with note "Set by support condition."
- `PF` or `FF` (End B fixed): same for `restraint.endB = 'F'`, grey out + disable End B.
- On switching back to `PP`: release all locks; previously auto-set values remain but become editable.

Implementation: add `lockedEndA` / `lockedEndB` boolean derived from `inputs.supportCondition` and
pass as props to RestraintPanel. Disabled selects render with `disabled` attribute and a note span.

## loadCombinations.ts — fixed-end moment analysis

In `analyseBeam()`, after computing `M_ss(x)` via simply-supported superposition, apply FEM
correction for fixed ends. The corrected moment at position x:

```
M(x) = M_ss(x) − FEM_A × (1 − x/L) − FEM_B × (x/L)
```

Fixed-end moments per load type (standard structural mechanics, Roark's Table 8.1):

**Point load P at distance a from left, b = L − a:**
- FF: FEM_A = P·a·b²/L²  (hogging, subtract),  FEM_B = P·a²·b/L²  (hogging, subtract)
- FP (End A fixed, End B pin): FEM_A = P·b·(3a+b) / (2L²) × ... use propped-cantilever tables exactly as per HANDOVER.md §Item 1
- PF (End A pin, End B fixed): FEM_B = P·a·(a+3b) / (2L²) × ... standard propped tables

**Full-span UDL w:**
- FF: FEM_A = FEM_B = w·L²/12
- FP: FEM_B = w·L²/8 (End B fixed only)
- PF: FEM_A = w·L²/8 (End A fixed only)

**Partial-span UDL:** use standard fixed-end moment tables for partial loading as referenced
in HANDOVER.md §Item 1.

Reactions R_A and R_B follow from equilibrium after end moments are established:
```
R_A = (R_ss_A) + (FEM_B − FEM_A) / L
R_B = (R_ss_B) + (FEM_A − FEM_B) / L
```
where R_ss are the simply-supported reactions. Update SFD accordingly.

For PP: FEM_A = FEM_B = 0 — existing behaviour unchanged.

## deflection.ts — fixed-end boundary conditions

Update `calcDeflection` and `calcDeflectionProfile` to use the correct boundary conditions:
- PP: existing simply-supported formulation (unchanged)
- FF: zero slope + zero displacement at both ends
- FP / PF: zero slope + zero displacement at the fixed end; zero displacement (but free rotation) at the pin end

Use exact analytical deflection formulae for fixed/propped conditions consistent with
the FEM analysis above.

## evaluate.ts
Pass `inputs.supportCondition` through to `analyseBeam()` and deflection functions.

## pdfExport.ts — page 1 calc sheet
On page 3, state support condition in the Geometry section:
```
Support: Pin–Pin   (or Fixed–Pin, Pin–Fixed, Fixed–Fixed)
```

## DesignIntermediates extension
Add to `DesignIntermediates` (types/index.ts):
```typescript
supportCondition: SupportCondition;
femA: number;   // kN·m, hogging positive
femB: number;   // kN·m, hogging positive
```
Populate in `evaluate.ts` from the beam analysis results.

## Critic checklist (card-specific)
- `SupportCondition` type and `supportCondition: SupportCondition` on `DesignInputs`
- Default `'PP'` — existing behaviour unchanged end-to-end
- FEM formulas match standard structural mechanics (not invented); implemented for all four load types
- BMD correction: `M(x) = M_ss(x) − FEM_A·(1−x/L) − FEM_B·(x/L)` applied after superposition
- Deflection updated for fixed-end boundary conditions (not still using simply-supported formula)
- RestraintPanel grey-out: fixed end selects show `disabled` + "Set by support condition." note
- Switching back to PP releases locks (selects become editable)
- PDF page 3 states support condition
- `DesignIntermediates` extended with `supportCondition`, `femA`, `femB`

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Take screenshot of Geometry panel — confirm "Support Conditions" dropdown visible below Span.
3. Configure: 360UB44.7, 10m span, 20 kN/m full-span G UDL, Pin-Pin (default). Note midspan
   M* and peak deflection.
4. Change Support Conditions to "Fixed–Fixed". Take screenshot of Results panel BMD chart — confirm
   hogging (negative) moments visible at both ends and reduced sagging at midspan vs Pin-Pin.
5. Take screenshot of Restraints panel — confirm End A and End B restraint selects are greyed out
   (disabled) with "Set by support condition." note visible.
6. Confirm M* (midspan) is lower for Fixed-Fixed than Pin-Pin for the same load (fixed supports
   carry moment, reducing the span moment).
7. Confirm deflection is lower for Fixed-Fixed than Pin-Pin (as expected).
8. Change to "Pin–Fixed". Confirm only End B is locked; End A remains editable.
9. Switch back to "Pin–Pin". Confirm both restraint selects become editable again.
10. Take final screenshot of full app in PP mode confirming no regression vs base state.

## History
(append-only)
```

---

### `.nova/cards/4R4.md` — Axial compression + combined actions (Item 2)

```markdown
# 4R4 — Axial compression + combined actions (Item 2)

## STATUS
- Column: BACKLOG (becomes READY when 4R3 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 2 — Compressive axial load (beam-column), AS4100 Cl. 8.4

## Files owned
- `src/types/index.ts`
- `src/engineering/as4100/compressionCapacity.ts` (NEW FILE — create it)
- `src/engineering/evaluate.ts`
- `src/components/LoadPanel.tsx`
- `src/components/ResultsPanel.tsx`
- `src/utils/pdfExport.ts`

## Type additions (types/index.ts)

```typescript
// Add to DesignInputs:
axialCompression: { magnitude: number; category: LoadCategory } | null;  // null = no compression

// Add to DesignIntermediates:
nStar: number;              // kN
phiNs: number;              // kN
phiNc: number;              // kN
kf: number;
lambdaN: number;
alphaC: number;
combinedSectionRatio: number;   // N*/φNs + M*/φMs
combinedMemberRatio: number;    // N*/φNc + M*/φMbx

// Add to CapacityResults.passes:
combinedSection: boolean;
combinedMember: boolean;
```

## compressionCapacity.ts (NEW FILE)

```typescript
// src/engineering/as4100/compressionCapacity.ts

import type { SteelSection, SectionClass } from '@/types';

export interface CompressionResult {
  phiNs: number;    // kN
  phiNc: number;    // kN
  kf: number;
  lambdaN: number;
  alphaC: number;
}

export function calcCompressionCapacity(
  section: SteelSection,
  fy: number,
  Le_mm: number,
  sectionClass: SectionClass,
): CompressionResult {
  const Ag = section.Ag;  // mm²
  const Ix = section.Ix;  // mm⁴
  const Iy = section.Iy;  // mm⁴

  // Section capacity (Cl. 6.2)
  const phiNs = 0.9 * Ag * fy / 1000;  // kN

  // Form factor kf (Cl. 6.2.2)
  const kf = sectionClass === 'slender' ? (section.Aeff ?? Ag) / Ag : 1.0;

  // Minimum radius of gyration
  const rMin = Math.sqrt(Math.min(Ix, Iy) / Ag);

  // Modified slenderness (Cl. 6.3.3)
  const lambdaN = (Le_mm / rMin) * Math.sqrt(kf * fy / 250);

  // Member compression capacity (Cl. 6.3, Table 6.3.3(a) — HR residual stress category)
  // αc from AS4100 Table 6.3.3(a) for HR sections: use the standard Perry-Robertson curve
  const alphaC = calcAlphaC(lambdaN, 'HR');

  const phiNc = 0.9 * alphaC * kf * Ag * fy / 1000;  // kN

  return { phiNs, phiNc, kf, lambdaN, alphaC };
}

// AS4100 Table 6.3.3(a) — HR residual stress category column buckling factor
function calcAlphaC(lambdaN: number, _category: 'HR'): number {
  // Perry-Robertson formula per AS4100 Cl. 6.3.3
  const lambda_ny = 13.5;   // yield slenderness limit (Table 6.3.3)
  const lambda_na = 130;    // full slenderness range (AS4100 Table 6.3.3 limit)
  if (lambdaN <= lambda_ny) return 1.0;
  // AS4100 uses the compression member factor from Table 6.3.3(a)
  // Implement via closed-form approximation matching the tabulated values:
  const eta = 0.00326 * (lambdaN - 13.5);  // HR category imperfection factor
  const xi = ((lambdaN / 90) ** 2 + 1 + eta) / 2;
  const ac = xi - Math.sqrt(xi ** 2 - (lambdaN / 90) ** 2);
  return Math.min(ac, 1.0);
}
```

Note: If `SteelSection` does not yet have an `Aeff` field, it is only used when `sectionClass === 'slender'`
and can default to `Ag` (conservative). Do not add `Aeff` to the section database at this stage.

## evaluate.ts changes

```typescript
import { calcCompressionCapacity } from '@/engineering/as4100/compressionCapacity';
// ...
// Compute N* (factored axial compression)
let nStar = 0;
if (inputs.axialCompression) {
  const { magnitude, category } = inputs.axialCompression;
  // Apply load factors for each combo; take maximum
  const n12G15Q = category === 'G' ? 1.2 * magnitude : 1.5 * magnitude;
  const nGQ     = magnitude;
  const nG      = category === 'G' ? magnitude : 0;
  nStar = Math.max(n12G15Q, nGQ, nG);
}

const compCap = inputs.axialCompression
  ? calcCompressionCapacity(section, fy, Le_m * 1000, secCap.sectionClass)
  : { phiNs: 0, phiNc: 0, kf: 1.0, lambdaN: 0, alphaC: 1.0 };

const combinedSectionRatio = compCap.phiNs > 0
  ? nStar / compCap.phiNs + factored.Mmax / (results.phiMs * 1000) // Note units
  : 0;
const combinedMemberRatio = compCap.phiNc > 0
  ? nStar / compCap.phiNc + factored.Mmax / (results.phiMbx * 1000)
  : 0;
```

(Adjust unit conversions carefully — N* in kN, φNs/φNc in kN, M* in kN·m, φMs/φMbx in kN·m.)

Add to `passes`:
```typescript
combinedSection: inputs.axialCompression ? combinedSectionRatio <= 1.0 : true,
combinedMember:  inputs.axialCompression ? combinedMemberRatio  <= 1.0 : true,
```

Add to `DesignIntermediates` assembly:
```typescript
nStar,
phiNs: compCap.phiNs, phiNc: compCap.phiNc,
kf: compCap.kf, lambdaN: compCap.lambdaN, alphaC: compCap.alphaC,
combinedSectionRatio, combinedMemberRatio,
```

## LoadPanel.tsx changes

Add axial compression row at the bottom of the load input area (below all load tables):

```tsx
<div className="axial-compression-row">
  <label>Axial Compression (kN):
    <input
      type="number"
      value={inputs.axialCompression?.magnitude ?? ''}
      placeholder="0"
      onChange={e => {
        const val = parseFloat(e.target.value);
        onChange({ axialCompression: isNaN(val) || val === 0
          ? null
          : { magnitude: val, category: inputs.axialCompression?.category ?? 'G' }
        });
      }}
    />
  </label>
  <label>Category:
    <select
      value={inputs.axialCompression?.category ?? 'G'}
      onChange={e => onChange({ axialCompression: inputs.axialCompression
        ? { ...inputs.axialCompression, category: e.target.value as LoadCategory }
        : null
      })}
      disabled={!inputs.axialCompression}
    >
      <option value="G">G</option>
      <option value="Q">Q</option>
    </select>
  </label>
</div>
```

## ResultsPanel.tsx changes

Add two conditional rows below the existing results table, visible only when
`inputs.axialCompression !== null` (i.e., `results.intermediates.nStar > 0`):

| Check | Demand | Capacity | Util | Pass/Fail |
|---|---|---|---|---|
| Combined (Section) | N*/φNs + M*/φMs | ≤ 1.0 | {ratio} | PASS/FAIL |
| Combined (Member) | N*/φNc + M*/φMbx | ≤ 1.0 | {ratio} | PASS/FAIL |

Both rows feed into the overall PASS/FAIL determination.

## pdfExport.ts changes

On page 3 calc sheet, add a conditional "COMBINED ACTIONS [AS4100 Cl. 8.4]" section after the
shear section, rendered only when `args.inputs.axialCompression !== null`:

```
COMBINED ACTIONS [AS4100 Cl. 8.4]
N* = {nStar} kN
φNs = 0.9 × Ag × fy = 0.9 × {Ag} × {fy} / 1000 = {phiNs} kN
λn = (Le/r_min) × √(kf × fy / 250) = {values} = {lambdaN}
αc = {alphaC} (HR residual stress category, AS4100 Table 6.3.3(a))
φNc = 0.9 × αc × kf × Ag × fy / 1000 = {phiNc} kN
Section check: N*/φNs + M*/φMs = {ratio} ≤ 1.0 → {PASS/FAIL}  [Cl. 8.4.2.1]
Member check:  N*/φNc + M*/φMbx = {ratio} ≤ 1.0 → {PASS/FAIL}  [Cl. 8.4.2.2]
```

## App.tsx default state
Add `axialCompression: null` to initial `DesignInputs` (minimal exception; record in History).

## Critic checklist (card-specific)
- `axialCompression` field on `DesignInputs` is `... | null`, not `0` or optional
- `compressionCapacity.ts` is a NEW file — does not modify any existing engineering module
- `calcCompressionCapacity` signature matches HANDOVER: `(section, fy, Le_mm, sectionClass)`
- φNs formula: 0.9 × Ag × fy (Cl. 6.2.2 — section capacity)
- φNc formula uses kf, λn, αc correctly (Cl. 6.3.3)
- kf = 1.0 for compact and noncompact; kf = Aeff/Ag for slender (Aeff defaults to Ag if not in DB)
- Combined ratios: Section = N*/φNs + M*/φMs, Member = N*/φNc + M*/φMbx (units consistent — all kN, kN·m)
- Results rows hidden when `inputs.axialCompression === null`
- Both combined rows feed into overall PASS/FAIL
- PDF combined section rendered conditionally (only when N* > 0)
- `DesignIntermediates` extended with all 7 new fields (nStar, phiNs, phiNc, kf, lambdaN, alphaC, combinedSectionRatio, combinedMemberRatio)

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Take screenshot of Load panel — confirm "Axial Compression (kN)" row visible at the bottom.
3. Configure a beam (360UB44.7, 6m span, 10 kN/m G UDL). Note Results table — confirm NO
   combined action rows visible (axialCompression is null/0).
4. Enter Axial Compression = 100 kN, Category = G. Take screenshot of Results panel — confirm
   "Combined (Section)" and "Combined (Member)" rows now visible with demand/capacity/util values.
5. Confirm the combined utilisation values are plausible (non-zero, numeric, not NaN).
6. Increase axial load until combined check shows FAIL. Take screenshot confirming red FAIL in
   combined rows and overall FAIL status.
7. Clear axial (set to blank / 0). Confirm combined rows disappear from Results panel.
8. Export PDF. Take screenshot of page 3 — confirm "COMBINED ACTIONS [AS4100 Cl. 8.4]" section
   with formula substitutions visible.

## History
(append-only)
```

---

### `.nova/cards/4R5.md` — Expanded calculation working (Item 3)

```markdown
# 4R5 — Expanded calculation working (Item 3)

## STATUS
- Column: BACKLOG (becomes READY when 4R4 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 3 — Collapsible expanded calculation working in Results panel

## Files owned
- `src/components/ResultsPanel.tsx` (collapsible calc section only)

## Overview
Add a collapsible section directly below the existing Results table, toggled by a
"Show calculations ▾ / Hide calculations ▴" button. All values read from `results.intermediates`
— NO new engineering computation. Uses proper Unicode symbols (φ, λ, α, ψ, ≤, ², √).

## Implementation

### Toggle state
```tsx
const [showCalc, setShowCalc] = useState(false);
```

### Toggle button (below results table)
```tsx
<button onClick={() => setShowCalc(v => !v)}>
  {showCalc ? 'Hide calculations ▴' : 'Show calculations ▾'}
</button>
```

### Collapsible section (rendered when showCalc === true)
Render three subsections exactly as specified in HANDOVER.md §Item 3:

**BENDING [{util%}]** — Steps 1–9 from HANDOVER.md §Bending section
- Section classification with λ_f, λ_w, ε_p, ε_y, section class
- Ze with substituted value
- φMsx with formula + values
- Restraint note (Cl. 5.4.3.1)
- Assumption note (βm = −1.0)
- L_max formula + result
- Segment length vs L_max → LTB check required/not required
- If LTB required: L_eb, M_oa, α_m, α_s, φM_bx working

**SHEAR [{util%}]** — Steps 1–3 from HANDOVER.md §Shear section
- A_w formula + result
- d/t_w + slenderness limit + classification
- φV_v formula + result

**DEFLECTION** — Steps 1–3 from HANDOVER.md §Deflection section
- Live load category + ψ_l
- G+ψ_l·Q deflection: δ, limit, PASS/FAIL
- G deflection: δ, limit, PASS/FAIL

**COMBINED ACTIONS [{util%}]** — visible ONLY when `results.intermediates.nStar > 0`
- Section check: N*/φNs + M*/φMs = {ratio} ≤ 1.0 → PASS/FAIL [Cl. 8.4.2.1]
- Member check: N*/φNc + M*/φMbx = {ratio} ≤ 1.0 → PASS/FAIL [Cl. 8.4.2.2]

All values sourced from `results.intermediates`. No new calculations.

## Critic checklist (card-specific)
- ONLY `ResultsPanel.tsx` modified
- All three check groups rendered: BENDING, SHEAR, DEFLECTION
- COMBINED ACTIONS section present but conditionally rendered (nStar > 0)
- All formula steps match HANDOVER.md §Item 3 content exactly
- Unicode symbols used in UI: φ, λ, α, ψ, ≤, ², √
- Toggle button text: "Show calculations ▾" (collapsed) / "Hide calculations ▴" (expanded)
- No new engineering computation — reads `results.intermediates` only
- Assumption notes present: βm = −1.0 note; holes note; 2.5% flange force restraint note
- All values from `results.intermediates` — no hardcoded magic numbers

## Visual confirmation steps (Test Validator — browser MCP required)

1. Navigate to `http://localhost:5173`
2. Configure: 360UB44.7, 8m span, 20 kN/m G+Q line load, Office live load.
3. Take screenshot of Results panel — confirm "Show calculations ▾" button visible below results table.
4. Click "Show calculations ▾". Take screenshot — confirm collapsible section expands.
5. Confirm all three sections visible: BENDING, SHEAR, DEFLECTION.
6. Confirm BENDING section shows: λ_f, λ_w, section class, Ze, φMs value, restraint note,
   βm assumption note, and (if LTB required) L_eb/M_oa/α_m/α_s/φM_bx working.
7. Confirm Unicode symbols present (φ, λ, ψ, ≤).
8. Confirm DEFLECTION section shows live load category and ψ_l value.
9. Check that φMs value shown in calc working matches the φMs value in the results table.
10. Add axial compression (e.g. 200 kN). Confirm COMBINED ACTIONS section appears in the calc working.
11. Clear axial. Confirm COMBINED ACTIONS section disappears.
12. Click "Hide calculations ▴". Confirm collapsible section collapses.

## History
(append-only)
```

---

### `.nova/cards/4I1.md` — Integration + final visual QA

```markdown
# 4I1 — Integration + final visual QA

## STATUS
- Column: BACKLOG (becomes READY when 4R5 DONE)
- Agent: (unassigned)
- TV result: (pending)
- Evidence: (pending)

## Purpose
Final end-to-end verification of all Rev 4 changes. No code changes permitted. Confirms all
HANDOVER.md verification gates for all 6 cards are met in a single integrated session.

## Verification gates (from HANDOVER.md)

| Card | Gate |
|------|------|
| 4R0 | McVeigh theme: input text visible (dark on white); deflection label updates with live load type |
| 4R1 | Grade 350 increases fy/φMs/φMbx vs Grade 300 for same section; autoSelect respects grade |
| 4R2 | Job fields visible; PDF filename includes job metadata; round-trip import/export restores all state exactly |
| 4R3 | Fixed-Fixed UDL: BMD shows hogging at ends, sagging at midspan; PP unchanged; restraints locked at fixed ends |
| 4R4 | With N* > 0: combined rows appear; N* = 0: rows hidden; overstressed combined → FAIL |
| 4R5 | Toggle works; substituted values match results table; assumption notes present; compression section conditional |

Plus standard gates:
- `npx tsc --noEmit` — 0 errors
- `npm run build` — clean build

## Browser MCP confirmation procedure (required — all steps)

Using `mcp__playwright__browser_navigate`, `mcp__playwright__browser_fill_form`,
`mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_snapshot`,
`mcp__playwright__browser_click`, `mcp__playwright__browser_select_option`,
`mcp__playwright__browser_type`:

1. `npx tsc --noEmit` and `npm run build` — confirm 0 errors and clean build.
2. Navigate to `http://localhost:5173`. Take full-page screenshot.
3. **4R0**: Switch to McVeigh theme. Zoom into Load panel inputs — confirm dark text. Change
   live load to Storage; confirm Results panel label reads "G+0.6Q deflection limit: span /".
4. **4R1**: Select Grade 350. Confirm φMs higher than Grade 300 for same section.
5. **4R2**: Enter Job No "J001", Job Name "Town Hall". Export PDF; confirm filename. Reload;
   import JSON; confirm all state restored.
6. **4R3**: Select Fixed-Fixed with 10m span, 20 kN/m UDL. Confirm BMD shows hogging ends.
   Confirm Restraints panel End A + End B locked. Switch to PP; confirm unlocked.
7. **4R4**: Add 200 kN axial compression (G). Confirm combined rows appear. Remove it;
   confirm rows disappear.
8. **4R5**: Click "Show calculations ▾". Confirm calc working expands with three sections.
   Add axial compression; confirm COMBINED ACTIONS section appears.
9. Export PDF with job metadata + Fixed-Fixed + axial compression active. Open PDF.
   - Page 1: job block present, no text overlap.
   - Page 2: diagrams with reference lines showing fixed-end behaviour.
   - Page 3: calc sheet with support condition stated, combined actions section.
10. Take final screenshot of full app in default state (PP, Grade 300, no compression, Office).
    Confirm no regression vs base Rev 3 state.

Record all screenshot paths in STATUS Evidence block.

## History
(append-only)
```

---

## Journal Entry to Append

Append to `journal.md` at the bottom:

```markdown
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
```

---

## End-to-End Verification (after 4I1)

1. `npx tsc --noEmit` → 0 errors in `steel-beam-tool/`
2. `npm run build` → clean build
3. McVeigh theme: all input text readable (dark on white/light)
4. Dynamic deflection label: Storage → "G+0.6Q", Roof → "G+0Q", Office → "G+0.4Q"
5. Grade 350: φMs and φMbx higher than Grade 300 for same section
6. Auto-select: uses the selected grade
7. Job fields below header, stateless (resets on reload)
8. Export PDF: filename `J001_TownHall_YYYYMMDD_HHMM.pdf`; page 1 has job block
9. Round-trip JSON: import restores all state including liveLoadType, steelGrade, support condition
10. Fixed-Fixed with full-span UDL: BMD shows hogging at both ends + reduced midspan sagging
11. Fixed-Fixed: restraints locked at fixed ends; PP releases locks
12. N* > 0: combined rows visible in Results table; N* = 0: hidden
13. Overstressed combined → FAIL propagates to overall
14. Show/Hide calculations toggle: expands correctly; values match Results table
15. Combined Actions section in calc working: conditional on N* > 0
16. PDF page 3: support condition stated; Grade 350 reflected; combined actions section when N* > 0

---

## Files to Create / Modify During Execution

### Planning deliverables (before any implementation)
| Action | Path |
|--------|------|
| Update | `.nova/KANBAN.md` |
| Create | `.nova/cards/4R0.md` |
| Create | `.nova/cards/4R1.md` |
| Create | `.nova/cards/4R2.md` |
| Create | `.nova/cards/4R3.md` |
| Create | `.nova/cards/4R4.md` |
| Create | `.nova/cards/4R5.md` |
| Create | `.nova/cards/4I1.md` |
| Update | `journal.md` |
| Save   | `.nova/REV4-ORCHESTRATION-PLAN.md` |

### Source changes (per card, during implementation)
| Card | Files |
|------|-------|
| 4R0 | `src/index.css`, `src/components/ResultsPanel.tsx` |
| 4R1 | `src/types/index.ts`, `src/engineering/sections/sectionUtils.ts`, `src/engineering/evaluate.ts`, `src/engineering/sections/autoSelect.ts`, `src/components/GeometryPanel.tsx` + `src/App.tsx` (default state) |
| 4R2 | `src/App.tsx`, `src/utils/pdfExport.ts`, `src/components/ResultsPanel.tsx` |
| 4R3 | `src/types/index.ts`, `src/engineering/as1170/loadCombinations.ts`, `src/engineering/as4100/deflection.ts`, `src/components/GeometryPanel.tsx`, `src/components/RestraintPanel.tsx`, `src/engineering/evaluate.ts`, `src/utils/pdfExport.ts` + `src/App.tsx` (default state) |
| 4R4 | `src/types/index.ts`, `src/engineering/as4100/compressionCapacity.ts` (NEW), `src/engineering/evaluate.ts`, `src/components/LoadPanel.tsx`, `src/components/ResultsPanel.tsx`, `src/utils/pdfExport.ts` + `src/App.tsx` (default state) |
| 4R5 | `src/components/ResultsPanel.tsx` |

---

## Critical Non-Clobber Rules

- `types/index.ts`: extend existing interfaces; never remove `SteelSection`, `PointLoad`,
  `LineLoad`, `AreaLoad`, `DesignInputs`, `CapacityResults`, `DesignIntermediates`, `DiagramSet`,
  `ValidationError`, `RestraintConfig`, `DeflLimits`, or `DiagramPoint`
- `evaluate.ts`: each card adds to the intermediates assembly block; never removes prior fields
- `pdfExport.ts`: page 1 layout from Rev 3 is the baseline; 4R2 only inserts the job block
  near the top; 4R3/4R4 extend page 3 content only; page 2 diagram layout never touched
- `momentCapacity.ts` and `shearCapacity.ts`: do NOT modify — 4R5 reads intermediates that
  were populated by Rev 3; 4R4's new compressionCapacity.ts is a separate new file
- `sectionUtils.ts`: `calcFy` gains a second parameter with default `'G300'`; all existing
  callers that omit the second argument continue to work unchanged
