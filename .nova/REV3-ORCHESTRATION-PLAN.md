# Rev 3 Orchestration Plan — McVeigh Steel Designer

## Context

The handover document at `.Improvements\Rev 3\HANDOVER.md` specifies 5 improvements to the
McVeigh Steel Designer app (React 18 + TypeScript + Vite, `steel-beam-tool/`, dev server at
`localhost:5173`). Two items touch the engineering/types layer (1–2); three restructure and extend
`src/utils/pdfExport.ts` (3–5).

Unlike Rev 2 (all disjoint files, zero conflicts), Rev 3 has substantial cross-item file conflicts:
`types/index.ts` (Items 1+5), `deflection.ts` and `LoadPanel.tsx` (Items 1+2), `evaluate.ts`
(Items 1+5), and `pdfExport.ts` (Items 2+3+4+5). Parallel worktrees would require semantic
merge conflict resolution for items that are logically coupled. **Sequential execution on `main`
is the right model** — consistent with the Rev 2 precedent.

Five HANDOVER items collapse into **3 implementation cards** (A → B → C) plus one integration
card. The first executing agent also creates the kanban board, card files, and journal entry before
beginning implementation.

---

## Planning Deliverables (done in the planning context, before any code implementation)

These administrative setup tasks are completed as part of planning — they are NOT deferred to
the implementation agent. No source code changes are made in this phase.

1. **Update `.nova/KANBAN.md`** — replace content with the Rev 3 board (see §Kanban Board below)
2. **Create card files** — `.nova/cards/3R1.md`, `3R2.md`, `3R3.md`, `3I1.md` (see §Card Templates)
3. **Update `journal.md`** — append the Rev 3 Planning entry (see §Journal Entry)
4. **Save orchestration plan** — save this plan to `.nova/REV3-ORCHESTRATION-PLAN.md`

## Pre-execution Check (first action of the implementing agent)

5. **Verify dev server** — `npm run dev` running in `steel-beam-tool/` at `localhost:5173` before
   any Test Validator work

---

## Card Grouping

| Card | Name | HANDOVER Items | Primary Files Owned |
|------|------|----------------|---------------------|
| **3R1** | Engineering corrections | 1 + 2 | `types/index.ts`, `as1170/psiFactors.ts` (**new**), `as1170/loadCombinations.ts`, `as4100/deflection.ts`, `evaluate.ts`, `LoadPanel.tsx`, `ResultsPanel.tsx`, `App.tsx`, `pdfExport.ts` (2 label strings only) |
| **3R2** | PDF layout + diagrams | 3 + 4 | `pdfExport.ts` (page restructure + enhanced drawing only; NO other files) |
| **3R3** | PDF calc sheet | 5 | `types/index.ts`, `as4100/momentCapacity.ts`, `as4100/shearCapacity.ts`, `evaluate.ts`, `pdfExport.ts` (page 3+) |
| **3I1** | Integration + final QA | — | reads only; no code changes |

### Dependency graph

```
3R1 → 3R2 → 3R3 → 3I1
```

- **3R1 → 3R2**: CARD-B references deflection labels on PDF diagrams that CARD-A introduces.
  CARD-B must not start until CARD-A is merged to main and TypeScript is clean.
- **3R2 → 3R3**: CARD-C's page 3+ content begins immediately after CARD-B's page 2 diagrams.
  CARD-C must not start until CARD-B is merged to main.
- No parallel execution. Only one card is IN_PROGRESS at any time.

---

## Kanban Board

**File:** `.nova/KANBAN.md`

Replace the file with:

```markdown
# Rev 3 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV3-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| 3R1 | Engineering corrections (Items 1+2) | READY | (main) |
| 3R2 | PDF layout + enhanced diagrams (Items 3+4) | BACKLOG | (main) |
| 3R3 | PDF calc sheet (Item 5) | BACKLOG | (main) |
| 3I1 | Integration — verification + final visual QA | BACKLOG | (main) |
```

3R2 → READY when 3R1 DONE. 3R3 → READY when 3R2 DONE. 3I1 → READY when 3R3 DONE.

---

## Agent Roles

### Implementer
**Pull condition:** Card is READY.
**Must:** Work directly on `main` branch (no worktrees). Implement per HANDOVER.md spec exactly.
Self-verify `npx tsc --noEmit` and `npm run build` in `steel-beam-tool/` before moving to
CRITIC_REVIEW. Record commit hash in the card STATUS block.
**Must NOT:** Modify files outside Files Owned. Use `any` or `@ts-ignore`. Install packages.
**Commit format:** `rev3(3RX): <present-tense description>`

### Critic
**Pull condition:** Card is CRITIC_REVIEW with a commit hash recorded.
**Task:** Review implementation against HANDOVER.md spec. Issue APPROVED or CHANGES_REQUESTED
with specific file + line defect descriptions. Never implements fixes.
**Review checklist (in order):**
1. Scope — only Files Owned modified
2. Spec conformance — every HANDOVER.md sub-item for this card addressed
3. TypeScript hygiene — no `any`, no suppressions, no unused imports added
4. Card-specific checks (see each card template for card-specific checklist items)
5. Non-clobber — no prior enhancements removed; existing interfaces only extended
**Cycle limit:** Max 2 CHANGES_REQUESTED cycles. Cycle 2 failure → BLOCKED, escalate to user.

### Test Validator
**Pull condition:** Card is QA with APPROVED in STATUS block.
**Step 1 — Automated:** Run `npx tsc --noEmit` and `npm run build` in `steel-beam-tool/`.
FAIL → return to IN_PROGRESS with exact error output.
**Step 2 — Browser visual confirmation (required):** Use Playwright MCP to visually confirm each
item per the Visual Confirmation Steps in the card file. Record screenshot filenames.
Playwright MCP tools: `mcp__playwright__browser_navigate`, `mcp__playwright__browser_fill_form`,
`mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_snapshot`,
`mcp__playwright__browser_click`.
**On PASS:** Move card to DONE. Record screenshot evidence in STATUS block.
**On FAIL:** Return to IN_PROGRESS with annotated screenshot path + defect description.
After 2 failures → BLOCKED.

---

## Card Templates

### `.nova/cards/3R1.md` — Engineering corrections (Items 1+2)

```markdown
# 3R1 — Engineering corrections (Items 1+2)

## STATUS
- Column: READY
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 1 — Deflection combination G+Q → G+ψ_l·Q
- HANDOVER Item 2 — Point load position: metres → % of span

## Files owned
- `src/types/index.ts`
- `src/engineering/as1170/psiFactors.ts` (NEW FILE — create it)
- `src/engineering/as1170/loadCombinations.ts`
- `src/engineering/as4100/deflection.ts`
- `src/engineering/evaluate.ts`
- `src/components/LoadPanel.tsx`
- `src/components/ResultsPanel.tsx`
- `src/App.tsx`
- `src/utils/pdfExport.ts` (2 label strings only — see §pdfExport.ts changes below)

## Current type shapes (as of Rev 2 main — read before editing)

`src/types/index.ts` currently contains:
- `ComboName = '1.2G+1.5Q' | 'G+Q' | 'G'` (leave unchanged)
- `PointLoad { id, magnitude, position: number, category }` — `position` is currently metres
- `DesignInputs { span, tributaryWidth, section, loads, restraint, deflLimits }` — no liveLoadType
- `CapacityResults { deflectionGQ, deflectionLimitGQ, deflectionG, deflectionLimitG, ... }`
  note: the field names use "GQ" for the G+Q combo

`src/engineering/evaluate.ts` currently calls:
  `calcDeflection(inputs, 'G+Q')` — must change to pass psiL param
  `deflectionGQ` / `deflectionLimitGQ` field names must be updated to `deflectionGpsiLQ` /
  `deflectionLimitGpsiLQ` — **also update all references in ResultsPanel.tsx and pdfExport.ts**

`src/engineering/as4100/deflection.ts` currently has:
  `combo: 'G+Q' | 'G'` param; `qFactor = combo === 'G+Q' ? 1.0 : 0.0`
  Point load position used as: `a: pl.position * 1000` (metres → mm)
  This appears in BOTH `calcDeflection` and `calcDeflectionProfile`

`src/utils/pdfExport.ts` point load format (line ~223):
  `P: ${p.magnitude.toFixed(2)} kN @ ${p.position.toFixed(2)} m (${p.category})`
  → must become: `P: ${p.magnitude.toFixed(2)} kN @ ${p.position.toFixed(0)}% (${p.category})`

## Implementation steps

### types/index.ts additions
```ts
export type LiveLoadType =
  | 'domestic'
  | 'office'
  | 'parking'
  | 'retail'
  | 'storage'
  | 'roof';
```
Add `liveLoadType: LiveLoadType` to `DesignInputs`.
Rename `CapacityResults.deflectionGQ` → `deflectionGpsiLQ` and
`deflectionLimitGQ` → `deflectionLimitGpsiLQ`.
Rename `DiagramSet.deflectionGQ` → `deflectionGpsiLQ`.

### as1170/psiFactors.ts (NEW FILE)
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

### as4100/deflection.ts changes
Change signature:
  `calcDeflection(inputs, combo: 'G+ψ_l·Q' | 'G', psiL = 1.0): DeflectionResult`
  `calcDeflectionProfile(inputs, combo: 'G+ψ_l·Q' | 'G', psiL = 1.0)`
Inside: `qFactor = combo === 'G+ψ_l·Q' ? psiL : 0.0`
Point load position conversion — BOTH functions, change:
  `a: pl.position * 1000`  →  `a: (pl.position / 100) * inputs.span * 1000`

### as1170/loadCombinations.ts changes
Locate every use of `pl.position` as a distance in metres (for BMD/SFD point load reactions).
Apply same conversion: `(pl.position / 100) * inputs.span`

### evaluate.ts changes
```ts
import { getPsiL } from '@/engineering/as1170/psiFactors';
// ...
const psiL = getPsiL(inputs.liveLoadType);
const deflGpsiLQ = calcDeflection(inputs, 'G+ψ_l·Q', psiL).max;
const deflG = calcDeflection(inputs, 'G').max;
const deflLimitGpsiLQ = (inputs.span * 1000) / inputs.deflLimits.GQ;
const deflLimitG = (inputs.span * 1000) / inputs.deflLimits.G;
```
Update results object field names: `deflectionGpsiLQ`, `deflectionLimitGpsiLQ`.
Update diagrams: `deflectionGpsiLQ: calcDeflectionProfile(inputs, 'G+ψ_l·Q', psiL)`.

### LoadPanel.tsx changes
1. Add liveLoadType dropdown at TOP of panel (above all load tables):
```tsx
import { LIVE_LOAD_LABELS, PSI_L_FACTORS } from '@/engineering/as1170/psiFactors';
import type { LiveLoadType } from '@/types';
// ...
<label>Live Load Category (ψ_l factor)
  <select value={inputs.liveLoadType} onChange={e => onChange({ liveLoadType: e.target.value as LiveLoadType })}>
    {(Object.keys(LIVE_LOAD_LABELS) as LiveLoadType[]).map(k => (
      <option key={k} value={k}>{LIVE_LOAD_LABELS[k]} (ψ_l = {PSI_L_FACTORS[k]})</option>
    ))}
  </select>
</label>
```
2. Point load position column header: change "Position (m)" → "Position (% span)"
3. Point load position placeholder: change to "% of span"
4. Point load position validation: change `p.position < 0 || p.position > span`
   → `p.position < 0 || p.position > 100`

### ResultsPanel.tsx changes
Deflection row label: replace static 'Deflection (G+Q)' with dynamic label using psiL.
Import `getPsiL` and compute: `const psiL = getPsiL(inputs.liveLoadType)` then display
`Deflection (G+${psiL}Q)` in both the results table row and the deflection chart legend.
Also rename all references from `deflectionGQ` → `deflectionGpsiLQ` (matching types).

### App.tsx changes
Add `liveLoadType: 'office'` to the initial `DesignInputs` state object.

### pdfExport.ts changes (label only — 2 strings)
1. Deflection row label: `'Deflection G+Q'` → dynamic using psiL from results or inputs
   (simplest: receive `inputs` which already carries `liveLoadType`; compute psiL there)
2. Point load format: `${p.position.toFixed(2)} m` → `${p.position.toFixed(0)}%`

## Critic checklist (card-specific)
- ψ_l values match AS1170.1 Table 4.1 exactly (0.4 for domestic/office/parking/retail, 0.6 for storage, 0.0 for roof)
- Both `calcDeflection` AND `calcDeflectionProfile` converted for position AND psiL
- `loadCombinations.ts` point load position uses `(pl.position / 100) * span` (not metres)
- Validation in LoadPanel changed to 0–100 range (not > span)
- `DeflLimits.GQ` field name unchanged (it's the divisor, not the combo name)
- No references to old `deflectionGQ` field name remain across the codebase
- `App.tsx` default state has `liveLoadType: 'office'`
- `pdfExport.ts` is ONLY modified for the 2 label strings — no page layout changes

## Visual confirmation steps (Test Validator — browser MCP required)
Using Playwright MCP: `mcp__playwright__browser_navigate`, `mcp__playwright__browser_take_screenshot`,
`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_click`, `mcp__playwright__browser_fill_form`.

1. Navigate to `http://localhost:5173`
2. Take full-page screenshot → confirm liveLoadType dropdown is visible at top of Load panel
3. Set liveLoadType to "Storage" → confirm results table label changes to "Deflection (G+0.6Q)"
4. Take screenshot confirming the dynamic label
5. Confirm deflection chart legend also shows the dynamic label
6. In Point Loads: add a load at position "50" → confirm column header shows "% span" not "(m)"
7. Take screenshot showing point load position input area

## History
(append-only — add entries as work progresses)
```

---

### `.nova/cards/3R2.md` — PDF layout + enhanced diagrams (Items 3+4)

```markdown
# 3R2 — PDF layout + enhanced diagrams (Items 3+4)

## STATUS
- Column: BACKLOG (becomes READY when 3R1 is DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 3 — PDF text overlap fix
- HANDOVER Item 4 — PDF diagrams enhanced jsPDF drawing

## Files owned
- `src/utils/pdfExport.ts` ONLY — no other files

## Current pdfExport.ts structure (post-3R1)
Page 1 (single page): header (0–20mm), inputs (35–85mm left col), section props (35–106mm right col),
Design Check Summary heading at y=90 (conflicts with both columns!), rows at y=101/107/113/119/125,
Diagrams heading at y=140, BMD at y=148, SFD at y=197, Deflection at y=246.

The Diagrams section fits within A4 (y=286mm), but the table overlaps the right column (13×5=65mm
from y=41 to y=106, heading at y=90 = 16mm into right column).

## Implementation steps

### Item 3 — Overlap fix
1. Restraint line wrap: replace single `doc.text(restraintStr, 10, y)` with:
```ts
const restraintLines = doc.splitTextToSize(restraintStr, 90);
for (const line of restraintLines) { doc.text(line, 10, y); y += lineH; }
```
2. Table heading: move from y=90 → y=**115** (clears both columns)
3. Table column headers: y=95 → y=**120**
4. Separator line: y=96.5 → y=**121.5**
5. Row y-values: rowYs = `[101, 107, 113, 119, 125]` → `[127, 133, 139, 145, 151]`

### Item 3 — Move diagrams to page 2
After the last table row (y≈153): remove the Diagrams heading and all 3 drawDiagram calls from page 1.
Add `doc.addPage()` and then draw all 3 diagrams starting at y=20 on page 2:
```ts
doc.addPage();
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.text('Diagrams', 10, 15);
drawDiagram(doc, bmd,  'moment', inputs.span, 10, 22, 190, 40, 'Bending Moment Diagram (kN.m)',
  [{ value: results.phiMs, label: `φMs = ${results.phiMs.toFixed(1)} kN·m`, pass: results.passes.sectionMoment },
   { value: results.phiMbx, label: `φMbx = ${results.phiMbx.toFixed(1)} kN·m`, pass: results.passes.memberMoment }]);
drawDiagram(doc, sfd, 'shear', inputs.span, 10, 71, 190, 40, 'Shear Force Diagram (kN)',
  [{ value:  results.phiVv, label: `+φVv = ${results.phiVv.toFixed(1)} kN`, pass: results.passes.shear },
   { value: -results.phiVv, label: `−φVv = ${results.phiVv.toFixed(1)} kN`, pass: results.passes.shear }]);
drawDeflectionDiagram(doc, deflectionGpsiLQ, deflectionG, results.deflectionLimitGpsiLQ,
  results.deflectionLimitG, results.passes.deflectionGpsiLQ, results.passes.deflectionG,
  inputs.span, 10, 120, 190, 40, 'Deflection Profile (mm)');
```
Note the field renames from 3R1: `deflectionGpsiLQ`, `deflectionLimitGpsiLQ`, `passes.deflectionGpsiLQ`.

### Item 4 — Enhanced drawDiagram signature
Change `drawDiagram` to accept a `refLines` array:
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
  refLines: Array<{ value: number; label: string; pass: boolean }> = [],
): void
```
Inside the function, after drawing the demand curve, draw reference lines as dashed:
```ts
for (const ref of refLines) {
  const ry = originY + height / 2 - (ref.value / maxAbs) * yScale;
  const color: [number, number, number] = ref.pass ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.2);
  // Dashed via alternating segments (step=2mm)
  for (let dx = 0; dx < width; dx += 4) {
    doc.line(originX + dx, ry, originX + Math.min(dx + 2, width), ry);
  }
  doc.setFontSize(7);
  doc.text(ref.label, originX + width + 1, ry + 1);
}
```

### Item 4 — Enhanced drawDeflectionDiagram
Add `L/360` label alongside the existing `L/300` label. Currently only `L/${Math.round(...)}` is
drawn for the GQ line; the G line has no label. Add a label for the G limit line:
```ts
doc.text(`L/${Math.round(span / (limitG / 1000))}`, originX + width + 1, originY + limitG * yScale + 1);
```
Verify the L/300 line is the GQ limit and L/360 is the G limit (check the DeflLimits defaults).
Colour-code both: already done in existing code — verify both pass/fail colours are applied.

## Critic checklist (card-specific)
- ONLY `pdfExport.ts` modified — no changes to any other file
- Table y-values (115/120/121.5/rowYs) match the spec above exactly
- `drawDiagram` refLines parameter is optional (default `[]`) so existing call sites don't break
- BMD refLines: phiMs (section moment pass/fail) AND phiMbx (member moment pass/fail)
- SFD refLines: +phiVv AND −phiVv (same pass/fail flag for both)
- Deflection L/360 label added; L/300 label still present; both colour-coded
- `deflectionGpsiLQ` field names used (not the old `deflectionGQ`)

## Visual confirmation steps (Test Validator — browser MCP required)
Using Playwright MCP: `mcp__playwright__browser_navigate`, `mcp__playwright__browser_take_screenshot`,
`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_click`.

1. Navigate to `http://localhost:5173`. Configure a realistic beam (e.g. 360UB44.7, 8m span,
   20 kN/m line load G). Click "Export PDF Report".
2. Open the downloaded PDF in the browser. Take screenshots of each page.
3. Page 1: confirm NO text overlap. Restraint line should wrap within ~90mm. Table heading must
   clear both left and right columns (verify there is white space before the table heading).
4. Page 1: confirm Design Check Summary table has 5 rows, none overlapping section properties.
5. Page 2: confirm 3 diagrams are present (BMD, SFD, Deflection).
6. Page 2 BMD: confirm two dashed reference lines (φMs, φMbx) visible with labels.
7. Page 2 SFD: confirm two dashed reference lines (+φVv, −φVv) visible with labels.
8. Page 2 Deflection: confirm both L/300 and L/360 limit lines are labelled.
9. Set loads to cause FAIL state; re-export; confirm reference lines turn red on failing checks.

## History
(append-only)
```

---

### `.nova/cards/3R3.md` — PDF calc sheet (Item 5)

```markdown
# 3R3 — PDF calc sheet (Item 5)

## STATUS
- Column: BACKLOG (becomes READY when 3R2 is DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 5 — Running calculation sheet (PDF page 3+)

## Files owned
- `src/types/index.ts` (add DesignIntermediates + extend CapacityResults)
- `src/engineering/as4100/momentCapacity.ts`
- `src/engineering/as4100/shearCapacity.ts`
- `src/engineering/evaluate.ts`
- `src/utils/pdfExport.ts` (page 3+ only — do NOT change page 1 or page 2 content)

## DesignIntermediates interface (add to types/index.ts)
```ts
export interface DesignIntermediates {
  fy: number;
  flangeLambda: number; webLambda: number;
  flangeEp: number; flangeEy: number;
  webEp: number; webEy: number;
  sectionClass: SectionClass;
  Ze: number; Msx: number; phiMs: number;
  Le: number; Moa: number; alphaM: number; alphaS: number; phiMbx: number;
  Aw: number; dOnTw: number; slenderLimit: number; webSlender: boolean; Vv: number; phiVv: number;
  Mmax: number; Vmax: number; governingCombo: string;
  psiL: number; liveLoadTypeLabel: string;
  deflectionGpsiLQ: number; deflectionG: number;
  deflectionLimitGpsiLQ: number; deflectionLimitG: number;
}
```
Add `intermediates: DesignIntermediates` to `CapacityResults`.

## momentCapacity.ts augmentation
Current `calcSectionCapacity` returns `{ sectionClass, Ze, phiMs }`.
Extend return to include `{ flangeLambda, flangeEp, flangeEy, webLambda, webEp, webEy, Ze, Msx, phiMs, sectionClass }`.
Current `calcMemberCapacity` returns `{ phiMbx, alphaS }`.
Extend return to include `{ Moa, alphaM, alphaS, phiMbx }`.
(Moa is already computed internally — expose it.)

## shearCapacity.ts augmentation
Current `calcShearCapacity` returns `{ phiVv }`.
Extend return to include `{ Aw, dOnTw, slenderLimit, webSlender, Vv, phiVv }`.

## evaluate.ts changes
Assemble `DesignIntermediates` from the now-augmented return values:
```ts
import { LIVE_LOAD_LABELS } from '@/engineering/as1170/psiFactors';
// ...
const intermediates: DesignIntermediates = {
  fy,
  flangeLambda: secCap.flangeLambda, flangeEp: secCap.flangeEp, flangeEy: secCap.flangeEy,
  webLambda: secCap.webLambda, webEp: secCap.webEp, webEy: secCap.webEy,
  sectionClass: secCap.sectionClass, Ze: secCap.Ze, Msx: secCap.Msx, phiMs: secCap.phiMs,
  Le: Le_m, Moa: memCap.Moa, alphaM, alphaS: memCap.alphaS, phiMbx: memCap.phiMbx,
  Aw: shear.Aw, dOnTw: shear.dOnTw, slenderLimit: shear.slenderLimit,
  webSlender: shear.webSlender, Vv: shear.Vv, phiVv: shear.phiVv,
  Mmax: factored.Mmax, Vmax: factored.Vmax, governingCombo: '1.2G+1.5Q',
  psiL,
  liveLoadTypeLabel: LIVE_LOAD_LABELS[inputs.liveLoadType],
  deflectionGpsiLQ: deflGpsiLQ,
  deflectionG: deflG,
  deflectionLimitGpsiLQ: deflLimitGpsiLQ,
  deflectionLimitG: deflLimitG,
};
// Add to results:  intermediates
```

## pdfExport.ts — page 3 calc sheet
After the page 2 diagram calls, add:
```ts
doc.addPage();
let cy = 20;

function checkOverflow() { if (cy > 270) { doc.addPage(); cy = 20;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.setTextColor(100,100,100);
  doc.text('McVeigh Steel Designer — Calculation Sheet (cont.)', 10, cy); cy += 6;
  doc.setTextColor(0,0,0); } }

// Page 3 header
doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
doc.setTextColor(100,100,100);
doc.text('McVeigh Steel Designer — Calculation Sheet', 10, cy); cy += 6;
doc.setTextColor(0,0,0);
```
Then render 13 calc steps per HANDOVER.md §Item 5 §Calc sheet sequence.

**Rendering pattern for each step:**
- Bold heading line: `doc.setFont('helvetica','bold')` + step name + `[AS4100 Cl. X.X.X]`
- Normal indent lines for formula, substituted values, result
- Thin separator line after each step: `doc.line(10, cy, 200, cy); cy += 2;`
- Call `checkOverflow()` after each step

## PdfExportArgs extension
Add `intermediates: DesignIntermediates` to `PdfExportArgs` interface.
The call site in `ResultsPanel.tsx` must pass `intermediates` from `results.intermediates`.
(ResultsPanel.tsx is NOT in this card's Files Owned — but the Implementer must check that
pdfExport.ts `PdfExportArgs` matches the call site. If the call site needs updating, note it
in the card History and update ResultsPanel.tsx as a minimal exception, recording it in STATUS.)

## Critic checklist (card-specific)
- `DesignIntermediates` interface matches the HANDOVER.md spec exactly (all fields, types)
- `CapacityResults.intermediates` added (non-optional)
- momentCapacity.ts return objects extended, not replaced
- shearCapacity.ts return object extended, not replaced
- All 13 calc steps from HANDOVER.md §Item 5 rendered on page 3+
- Overflow: `checkOverflow()` called after every step; resets `cy = 20` on new page
- Page 3 page header present; continuation pages have "(cont.)" header
- Page 1 and page 2 content unchanged

## Visual confirmation steps (Test Validator — browser MCP required)
Using Playwright MCP: `mcp__playwright__browser_navigate`, `mcp__playwright__browser_take_screenshot`,
`mcp__playwright__browser_snapshot`, `mcp__playwright__browser_click`.

1. Navigate to `http://localhost:5173`. Set up a representative beam.
2. Click "Export PDF Report". Open the downloaded PDF.
3. Take screenshot of page 3 — confirm "Calculation Sheet" header is visible.
4. Confirm all 13 calc steps visible with step name, formula line, result line, AS clause tag.
5. Set a long beam with many loads to force page 4 overflow; re-export.
6. Take screenshot of page 4 — confirm "McVeigh Steel Designer — Calculation Sheet (cont.)" header.
7. Take screenshot of page 1 and page 2 to confirm they are unchanged from 3R2 (no regression).

## History
(append-only)
```

---

### `.nova/cards/3I1.md` — Integration + final QA

```markdown
# 3I1 — Integration + final visual QA

## STATUS
- Column: BACKLOG (becomes READY when 3R3 is DONE)
- Agent: (unassigned)
- TV result: (pending)
- Evidence: (pending)

## Purpose
Final end-to-end verification of all Rev 3 changes. No code changes. Confirms all 7
HANDOVER.md verification gates are met.

## Verification gates (from HANDOVER.md)
1. `npx tsc --noEmit` — 0 errors in `steel-beam-tool/`
2. `npm run build` — clean build in `steel-beam-tool/`
3. Browser: live load type dropdown visible at top of Load panel; changing to "Storage" updates
   results table label to "Deflection (G+0.6Q)"
4. Browser: point load position accepts 0–100; "50" on a 10m span produces midspan deflection
5. Browser: Export PDF — page 1 no text overlap; page 2 has diagrams with reference lines;
   page 3 has calc sheet
6. PDF: BMD has φMs and φMbx reference lines; SFD has ±φVv; deflection has both limit lines
   labelled
7. PDF: Calc sheet shows intermediate values with AS clause tags; overflows to page 4 correctly

## Browser MCP confirmation procedure (required — all 10 steps)
Using `mcp__playwright__browser_navigate`, `mcp__playwright__browser_fill_form`,
`mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_snapshot`,
`mcp__playwright__browser_click`:

1. Navigate to `http://localhost:5173`. Take full-page screenshot.
2. Confirm liveLoadType dropdown visible at top of Load panel. Take screenshot.
3. Change liveLoadType to "Storage". Take screenshot of results panel — confirm "G+0.6Q" label.
4. Add point load at position "50" on a 10m span. Confirm column header shows "% span".
5. Confirm deflection result is valid (no NaN). Take screenshot.
6. Click "Export PDF Report". Wait for browser download.
7. Navigate to the downloaded PDF in a new tab (or use browser PDF viewer).
8. Take screenshot of page 1 — confirm no text overlaps.
9. Take screenshot of page 2 — confirm 3 diagrams with dashed reference lines labelled.
10. Take screenshot of page 3 — confirm calc sheet with step headings and AS clause tags.
11. Configure loads to produce overflow; re-export. Take screenshot of page 4 — confirm cont. header.

Record all screenshot paths in STATUS Evidence block.

## History
(append-only)
```

---

## Journal Entry to Append

Append to `journal.md`:

```markdown
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
```

---

## Implementation Detail per Card

### 3R1 — Critical implementation notes

**ψ_l factor table** (AS1170.1 Table 4.1 — exact values required):

| Type key | Label | ψ_l |
|----------|-------|-----|
| domestic | Domestic / Residential | 0.4 |
| office | Office | 0.4 |
| parking | Parking | 0.4 |
| retail | Retail / Commercial | 0.4 |
| storage | Storage | 0.6 |
| roof | Roof (other) | 0.0 |

**Point load position conversion** — apply in ALL three consumers:
- `as4100/deflection.ts` `calcDeflection`: `a: (pl.position / 100) * inputs.span * 1000`
- `as4100/deflection.ts` `calcDeflectionProfile`: same
- `as1170/loadCombinations.ts`: wherever `pl.position` is used as a moment arm or reaction distance

**Field rename cascade** — search entire `steel-beam-tool/src/` for `deflectionGQ` before
committing to ensure no stale references remain.

### 3R2 — Critical implementation notes

**New diagram y-coordinates on page 2** (post Item 3 layout):
```
Diagrams heading: y=15
BMD: originY=22, height=40 → bottom at y=62
SFD: originY=71, height=40 → bottom at y=111
Deflection: originY=120, height=40 → bottom at y=160
```
All three diagrams fit within page 2 (A4 = 297mm; 160mm used).

**Reference lines for BMD** (signed values, drawn relative to midline):
- φMs → drawn at `+results.phiMs` (moment is positive upward on BMD convention)
- φMbx → drawn at `+results.phiMbx`
Both dashed, labelled at right edge.

**Reference lines for SFD** (both sides of zero):
- `+results.phiVv` → dashed line above neutral axis
- `-results.phiVv` → dashed line below neutral axis

### 3R3 — Critical implementation notes

**momentCapacity.ts current return types** (read before editing):
`calcSectionCapacity` currently returns `{ sectionClass, Ze, phiMs }` — extend, do not replace.
`calcMemberCapacity` currently returns `{ phiMbx, alphaS }` — extend, do not replace.

**shearCapacity.ts current return types**:
`calcShearCapacity` currently returns `{ phiVv }` — extend, do not replace.

**Msx computation**: `Msx = Ze * fy` (N·mm); `phiMs = 0.9 * Msx / 1e6` (kN·m).
Both Msx and Ze must be in the return object.

**Call site for `exportToPDF`** is in `ResultsPanel.tsx`. That file is NOT owned by 3R3.
When 3R3's Implementer adds `intermediates` to `PdfExportArgs`, they must check the call site.
If the call site needs updating, it is permitted as a minimal exception and must be recorded in
the 3R3 card History. The Critic must verify the call site passes `results.intermediates`.

---

## Verification (end-to-end, after 3I1)

1. `npx tsc --noEmit` → 0 errors
2. `npm run build` → clean build
3. Browser MCP at `http://localhost:5173`:
   - liveLoadType dropdown at top of Load panel; "Storage" → "Deflection (G+0.6Q)" label
   - Point load position column header: "Position (% span)"
   - 50% position on 10m span → same deflection as 5.00m (old metres) input
4. PDF export — page 1: no text overlap; table heading below both columns
5. PDF export — page 2: 3 diagrams with reference lines; L/300 and L/360 both labelled
6. PDF export — page 3+: all 13 calc steps with AS clause tags
7. PDF export — overflow test: page 4 shows cont. header

---

## Files to Create / Modify During Execution

| Action | Path |
|--------|------|
| Update | `.nova/KANBAN.md` |
| Create | `.nova/cards/3R1.md` |
| Create | `.nova/cards/3R2.md` |
| Create | `.nova/cards/3R3.md` |
| Create | `.nova/cards/3I1.md` |
| Update | `journal.md` |
| Edit | `steel-beam-tool/src/types/index.ts` |
| Create | `steel-beam-tool/src/engineering/as1170/psiFactors.ts` |
| Edit | `steel-beam-tool/src/engineering/as1170/loadCombinations.ts` |
| Edit | `steel-beam-tool/src/engineering/as4100/deflection.ts` |
| Edit | `steel-beam-tool/src/engineering/evaluate.ts` |
| Edit | `steel-beam-tool/src/components/LoadPanel.tsx` |
| Edit | `steel-beam-tool/src/components/ResultsPanel.tsx` |
| Edit | `steel-beam-tool/src/App.tsx` |
| Edit | `steel-beam-tool/src/utils/pdfExport.ts` |
| Edit | `steel-beam-tool/src/engineering/as4100/momentCapacity.ts` |
| Edit | `steel-beam-tool/src/engineering/as4100/shearCapacity.ts` |

---

## Critical Non-Clobber Rules

- `types/index.ts`: add new interfaces; **do not remove** `DiagramSet`, `DeflectionProfilePoint`,
  `ValidationError`, `SteelSection`, `Loads`, `RestraintConfig`, `DeflLimits`, `DiagramPoint`
- `pdfExport.ts` in 3R3: only add page 3+ content and update `PdfExportArgs`; **do not touch**
  the page 1 or page 2 layout established by 3R2
- `momentCapacity.ts` and `shearCapacity.ts`: extend return objects; **do not change** existing
  field names or signatures (only add fields)
- `ResultsPanel.tsx`: not owned by 3R1/3R2/3R3 except for field rename cascade (deflectionGQ →
  deflectionGpsiLQ) in 3R1 and the `intermediates` call-site fix in 3R3
