# Rev 5 Orchestration Plan — McVeigh Steel Designer

## Context

The handover document at `.Improvements\Rev 5\HANDOVER.md` specifies 4 improvements to the
McVeigh Steel Designer app (React 18 + TypeScript + Vite, `steel-beam-tool/`, dev server at
`localhost:5173`). All decisions are final — confirmed with the engineer during a design interview
on 2026-06-03.

Items span two categories:
- **Targeted patches** (Items 1, 2, 3): white-on-white text fix; tab navigation + stub; PDF BMD sign
- **New feature** (Item 4): full Steel Column design tool (AS4100 Cl. 6 + 8) across 8 new files

File conflicts make **sequential execution on `main`** the only viable model (consistent with Rev 2,
3, and 4 precedent). `App.tsx` is touched by Items 2 and 4; `sectionUtils.ts` and `types/index.ts`
by Item 4 types + sectionUtils extension. Parallel worktrees would require semantic merge conflict
resolution on logically coupled files.

Four HANDOVER items collapse into **5 implementation cards** (5R0 → 5R4) and one integration card
(5I1). 5R0 and 5R1 are logically parallel (completely disjoint files) but executed sequentially on
`main` for consistency. 5R2 → 5R3 → 5R4 are strictly sequential (types → components → PDF).

---

## Planning Deliverables

These administrative setup tasks are performed as the **first and only actions** in the approval
context — **before any source code changes**. After saving these files, PAUSE and await explicit
instruction to begin implementation.

1. **Save orchestration plan** — save this document to `.nova/REV5-ORCHESTRATION-PLAN.md`
2. **Update `.nova/KANBAN.md`** — replace content with the Rev 5 board (see §Kanban Board)
3. **Create card files** — `.nova/cards/5R0.md` through `.nova/cards/5I1.md` (6 files, see §Card Templates)
4. **Update `journal.md`** — append the Rev 5 Planning entry (see §Journal Entry)
5. **Confirm saved** — report each file path written, then PAUSE

---

## Card Grouping

| Card | Items | Title | Primary Files Owned |
|------|-------|-------|---------------------|
| **5R0** | 1, 3 | CSS text fix + PDF BMD flip | `src/index.css`, `src/components/RestraintPanel.tsx`, `src/utils/pdfExport.ts` |
| **5R1** | 2 | Tab navigation + ColumnApp stub | `src/App.tsx`, `src/ColumnApp.tsx` (NEW) |
| **5R2** | 4a | Column types + engineering | `src/types/column.ts` (NEW), `src/engineering/as4100/columnCapacity.ts` (NEW), `src/engineering/sections/sectionUtils.ts`, `src/types/index.ts` |
| **5R3** | 4b | Column components + hook | `src/components/ColumnGeometryPanel.tsx` (NEW), `src/components/ColumnLoadPanel.tsx` (NEW), `src/components/ColumnResultsPanel.tsx` (NEW), `src/hooks/useColumnCalculations.ts` (NEW), `src/ColumnApp.tsx` |
| **5R4** | 4c | Column PDF export | `src/utils/columnPdfExport.ts` (NEW), `src/components/ColumnResultsPanel.tsx` |
| **5I1** | — | Integration — verification + final visual QA | reads only; no code changes |

### Dependency Graph

```
5R0 → 5R1 → 5R2 → 5R3 → 5R4 → 5I1
```

- **5R0 → 5R1**: 5R0 is disjoint (index.css, RestraintPanel, pdfExport); executed first as lowest-risk patch.
- **5R1 → 5R2**: `App.tsx` structure and `ColumnApp.tsx` stub must exist before 5R2 adds types that
  `ColumnApp.tsx` will later import. Avoids TS errors from forward references.
- **5R2 → 5R3**: `ColumnInputs`, `ColumnResults`, `ColumnIntermediates` types and `evaluateColumn()`
  must exist before components import and use them.
- **5R3 → 5R4**: `ColumnResults` shape must be final before `columnPdfExport.ts` is written to
  consume it. `ColumnResultsPanel` PDF button wire-up also requires the export function to exist.
- No parallel execution. Only one card IN_PROGRESS at any time.

---

## Kanban Board

**File:** `.nova/KANBAN.md`

Replace the file with:

```markdown
# Rev 5 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV5-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| 5R0 | CSS text fix + PDF BMD flip (Items 1+3) | READY | (main) |
| 5R1 | Tab navigation + ColumnApp stub (Item 2) | BACKLOG | (main) |
| 5R2 | Column types + engineering (Item 4a) | BACKLOG | (main) |
| 5R3 | Column components + hook (Item 4b) | BACKLOG | (main) |
| 5R4 | Column PDF export (Item 4c) | BACKLOG | (main) |
| 5I1 | Integration — verification + final visual QA | BACKLOG | (main) |

5R1 → READY when 5R0 DONE. 5R2 → READY when 5R1 DONE. 5R3 → READY when 5R2 DONE.
5R4 → READY when 5R3 DONE. 5I1 → READY when 5R4 DONE.
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
**Commit format:** `rev5(5RX): <present-tense description>`

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
filenames in STATUS Evidence block. Screenshots saved to `.nova/evidence/rev5/`.
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

### `.nova/cards/5R0.md` — CSS text fix + PDF BMD flip (Items 1+3)

```markdown
# 5R0 — CSS text fix + PDF BMD flip (Items 1+3)

## STATUS
- Column: READY
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 1 — White-on-white text fix (McVeigh theme: Recharts labels + Restraints toggle)
- HANDOVER Item 3 — PDF BMD orientation (sign flip in drawDiagram)

## Files owned
- `src/index.css`
- `src/components/RestraintPanel.tsx`
- `src/utils/pdfExport.ts`

## Implementation steps

### Item 1A — index.css
Add one CSS rule block at the end of the McVeigh theme section targeting Recharts SVG text elements:

```css
[data-theme="mcveigh"] .recharts-cartesian-axis-tick-value,
[data-theme="mcveigh"] .recharts-legend-item-text,
[data-theme="mcveigh"] .recharts-label,
[data-theme="mcveigh"] .recharts-text {
  fill: #333333 !important;
}
```

Do NOT modify any other existing CSS rules.

### Item 1B — RestraintPanel.tsx
Locate the Simple/Advanced toggle button class expression (line ~65–71). Change the inactive button
class from `'bg-white'` to `'bg-white text-gray-800'`:

```tsx
r.mode === mode ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'
```

Only this one class string changes. No structural JSX changes.

**Before committing:** visually audit all McVeigh-themed panels in the browser for any other
white-background elements lacking explicit text colour. If found, apply `text-gray-800` inline or
via a targeted CSS rule.

### Item 3 — pdfExport.ts
In `drawDiagram` (around line 93 and 97), the Y coordinate for demand curve points uses a minus sign
that maps positive moment values upward (structurally inverted). Change to plus so sagging
(positive) moment maps downward, matching the on-screen Recharts convention:

**Change (applied in both the `prevY` initialisation and the loop body):**
```js
// Before:
const y = originY + height / 2 - (points[i][field] / scaleMax) * yScale;
// After:
const y = originY + height / 2 + (points[i][field] / scaleMax) * yScale;
```

Apply the same sign change to `prevY` initialisation (line ~93) and the loop update (line ~97).

**Scope:** This fix applies to the moment diagram field only. Do NOT change the SFD path (shear
sign convention is symmetric — SFD already renders correctly). Do NOT touch `drawDeflectionDiagram`.

## Critic checklist (card-specific)
- CSS rule uses four selectors: `.recharts-cartesian-axis-tick-value`, `.recharts-legend-item-text`,
  `.recharts-label`, `.recharts-text` — all four present
- CSS rule uses `[data-theme="mcveigh"]` attribute prefix on each selector
- `fill: #333333 !important` (overrides SVG inline fill inheritance)
- No other CSS rules modified
- RestraintPanel.tsx: only the inactive toggle class changed to `'bg-white text-gray-800'`; no other lines touched
- pdfExport.ts: ONLY the BMD `drawDiagram` Y formula changed (minus → plus); SFD path untouched;
  `drawDeflectionDiagram` untouched
- Both `prevY` initialisation AND the loop body Y formula updated (both must change together)
- `npx tsc --noEmit` + `npm run build` pass before CRITIC_REVIEW

## Visual confirmation steps (Test Validator — browser MCP required)

### Item 1 verification
1. Ensure dev server is running at `http://localhost:5173` (run `npm run dev` in `steel-beam-tool/` if not).
2. Navigate to `http://localhost:5173`.
3. Switch to McVeigh theme using the theme dropdown in the header.
4. Take full-page screenshot (`5R0-mcveigh-overview.png`).
5. Confirm the Restraints panel Simple/Advanced toggle: the **inactive** button must show dark text
   on white background (not invisible cream-on-white). Take close-up screenshot (`5R0-restraints-toggle.png`).
6. Configure a beam with some load so the Results panel shows all Recharts charts (BMD, SFD, deflection).
7. Take screenshot of the Results panel (`5R0-recharts-charts.png`).
8. Confirm Recharts axis tick labels, legend text, and any chart labels are **dark and readable**
   (not invisible cream text on white chart background).

### Item 3 verification
9. Export a PDF for a simply-supported beam (Pin–Pin, e.g. 360UB44.7, 8m span, 20 kN/m G UDL).
10. Open the PDF to page 2.
11. Take screenshot of page 2 BMD (`5R0-pdf-bmd.png`).
12. Confirm the BMD curve peak points **downward** (sagging convention — positive moment below
    baseline), matching the on-screen Recharts BMD. Pre-fix: peak was pointing upward.
13. Confirm the SFD on page 2 still renders correctly (positive shear above baseline at left end).

## History
(append-only — add entries as work progresses)
```

---

### `.nova/cards/5R1.md` — Tab navigation + ColumnApp stub (Item 2)

```markdown
# 5R1 — Tab navigation + ColumnApp stub (Item 2)

## STATUS
- Column: BACKLOG (becomes READY when 5R0 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 2 — Steel Column tab beside Steel Beam tab; both tabs preserve state

## Files owned
- `src/App.tsx`
- `src/ColumnApp.tsx` (NEW FILE — create it)

## Implementation steps

### App.tsx — activeTab state
Add `activeTab` state at the top of the App component:

```tsx
const [activeTab, setActiveTab] = useState<'beam' | 'column'>('beam');
```

### App.tsx — nav bar change (~line 124–134)
Replace the existing single "Steel Beam" nav button with a two-tab map:

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

### App.tsx — mount both tabs (always mounted, CSS-hidden when inactive)
Wrap the existing beam UI in a `<div>` with `className={activeTab === 'beam' ? '' : 'hidden'}`.
Add `<ColumnApp className={activeTab === 'column' ? '' : 'hidden'} />` below it.

**Do NOT** use conditional rendering (`activeTab === 'beam' ? <BeamUI/> : null`) — both components
must remain mounted to preserve state on tab switch.

### ColumnApp.tsx (NEW FILE — stub only for this card)
Create a minimal placeholder component that will be replaced in 5R3:

```tsx
// src/ColumnApp.tsx
interface ColumnAppProps {
  className?: string;
}

export default function ColumnApp({ className }: ColumnAppProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-center h-64 text-gray-500">
        Steel Column tool — coming soon
      </div>
    </div>
  );
}
```

## Critic checklist (card-specific)
- `activeTab` state type is `'beam' | 'column'` (union literal, not string)
- Default is `'beam'` — existing beam UI shows on load unchanged
- Nav renders exactly two buttons: "Steel Beam" and "Steel Column"
- Active tab: `color: var(--mc-gold)` + `borderBottom: '2px solid var(--mc-gold)'`
- Inactive tab: `color: var(--mc-gold-light)` only (no underline)
- Both beam and column `<div>` containers always mounted (CSS `hidden` class, not conditional unmount)
- `ColumnApp.tsx` is a new file; it is a placeholder only — no column logic in this card
- No beam UI behaviour changed

## Visual confirmation steps (Test Validator — browser MCP required)

1. Ensure dev server is running at `http://localhost:5173`.
2. Navigate to `http://localhost:5173`.
3. Take full-page screenshot (`5R1-default-beam-tab.png`) — confirm "Steel Beam" tab is active
   (gold underline), "Steel Column" tab visible but inactive.
4. Configure a beam (e.g. 360UB44.7, 8m span, 20 kN/m G load). Note the span value.
5. Click the "Steel Column" tab.
6. Take full-page screenshot (`5R1-column-stub.png`) — confirm the Steel Column tab is now active
   (gold underline on "Steel Column"), the beam UI is hidden, and the column stub
   ("Steel Column tool — coming soon") is visible.
7. Click back to "Steel Beam" tab.
8. Take screenshot (`5R1-beam-restored.png`) — confirm the beam UI is restored with the same
   span value as entered in step 4 (state preserved — not reset to default).

## History
(append-only)
```

---

### `.nova/cards/5R2.md` — Column types + engineering (Item 4a)

```markdown
# 5R2 — Column types + engineering (Item 4a)

## STATUS
- Column: BACKLOG (becomes READY when 5R1 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 4 (types + engineering layer) — ColumnInputs, ColumnResults, ColumnIntermediates
  types; evaluateColumn() with all 8 AS4100 checks; calcFyHollow helper

## Files owned
- `src/types/column.ts` (NEW FILE)
- `src/engineering/as4100/columnCapacity.ts` (NEW FILE)
- `src/engineering/sections/sectionUtils.ts` (add calcFyHollow)
- `src/types/index.ts` (add HollowSteelGrade union if not present)

## Reused without modification
- `src/engineering/sections/sectionDatabase.ts` — existing UC/SHS/RHS/CHS entries
- `src/engineering/sections/sectionUtils.ts` — getSectionsByType, getDefaultSection (read-only reuse)
- `src/engineering/as4100/compressionCapacity.ts` — calcAlphaC reused via import
- `src/engineering/as4100/momentCapacity.ts` — section classification + Ze + phiMs reused via import

## Type additions

### src/types/index.ts
Add hollow grade union (if not already present):
```typescript
export type HollowSteelGrade = 'C250' | 'C350' | 'C450';
```

### src/types/column.ts (NEW FILE)
```typescript
import type { SteelSection, SteelGrade } from '@/types';
import type { HollowSteelGrade } from '@/types';

export type ColumnSectionType = 'UC' | 'SHS' | 'RHS' | 'CHS';

export interface ColumnInputs {
  height: number;             // m
  sectionType: ColumnSectionType;
  steelGrade: SteelGrade | HollowSteelGrade;
  section: SteelSection;
  kx: number;                 // effective length factor, x-axis; default 1.0
  ky: number;                 // effective length factor, y-axis; default 1.0
  G: number;                  // kN, unfactored dead load
  Q: number;                  // kN, unfactored live load
  ex: number;                 // mm, eccentricity x-direction; default 0
  ey: number;                 // mm, eccentricity y-direction; default 0
}

export interface ColumnResults {
  phiNs: number;              // kN — axial section capacity
  phiNcX: number;             // kN — axial member capacity, x-axis
  phiNcY: number;             // kN — axial member capacity, y-axis
  phiNc: number;              // kN — governing member capacity (min of x, y)
  phiMsx: number;             // kN.m — bending section capacity x-axis
  phiMsy: number;             // kN.m — bending section capacity y-axis
  phiMbx: number;             // kN.m — bending member capacity x-axis (LTB for UC; = phiMsx for hollow)
  phiMby: number;             // kN.m — = phiMsy (no LTB for y-axis)
  nStar: number;              // kN — factored axial load
  mStarX: number;             // kN.m — factored moment x-axis
  mStarY: number;             // kN.m — factored moment y-axis
  utilNs: number;             // N*/phiNs ratio
  utilNcX: number;            // N*/phiNc_x ratio
  utilNcY: number;            // N*/phiNc_y ratio
  utilMsx: number;            // M*x/phiMsx ratio (0 if M*x=0)
  utilMsy: number;            // M*y/phiMsy ratio (0 if M*y=0)
  ratioSection: number;       // combined section ratio Cl. 8.3.3
  ratioMemberInplane: number; // combined member in-plane Cl. 8.4.2
  ratioMemberOutofplane: number; // combined member out-of-plane Cl. 8.4.4
  passes: {
    axialSection: boolean;
    axialMemberX: boolean;
    axialMemberY: boolean;
    bendingX: boolean;          // always true if M*x = 0
    bendingY: boolean;          // always true if M*y = 0
    combinedSection: boolean;
    combinedMemberInplane: boolean;
    combinedMemberOutofplane: boolean;
    overall: boolean;
  };
  intermediates: ColumnIntermediates;
}

export interface ColumnIntermediates {
  fy: number;                 // MPa
  kf: number;                 // form factor (1.0)
  LeX: number;                // m, effective length x-axis
  LeY: number;                // m, effective length y-axis
  rX: number;                 // mm, radius of gyration x
  rY: number;                 // mm, radius of gyration y
  lambdaNX: number;           // modified slenderness x
  lambdaNY: number;           // modified slenderness y
  alphaCX: number;            // compression factor x
  alphaCY: number;            // compression factor y
  sectionClass: string;
  ZeX: number;                // mm3, effective section modulus x
  ZeY: number;                // mm3, effective section modulus y
  isHollow: boolean;
}
```

## sectionUtils.ts — add calcFyHollow

Add after existing `calcFy`:
```typescript
export function calcFyHollow(grade: HollowSteelGrade): number {
  switch (grade) {
    case 'C250': return 250;
    case 'C350': return 350;
    case 'C450': return 450;
  }
}
```

Import `HollowSteelGrade` from `@/types` (consistent with where `HollowSteelGrade` is exported).

## columnCapacity.ts (NEW FILE)

Full implementation of `evaluateColumn()` per HANDOVER §4.3. Key formula points:

- fy: `calcFy(section, grade)` for UC (AS3678 thickness-dependent); `calcFyHollow(grade)` for hollow (AS1163 flat)
- LeX = kx × height (m); LeY = ky × height (m)
- rX = sqrt(Ix / Ag) in mm; rY = sqrt(Iy / Ag) in mm
- kf = 1.0 (conservative per §4.3.2)
- phiNs = 0.9 × kf × Ag × fy / 1000 (kN)
- lambdaNX = (LeX × 1000 / rX) × sqrt(kf × fy / 250)
- lambdaNY = (LeY × 1000 / rY) × sqrt(kf × fy / 250)
- alphaCX = calcAlphaC(lambdaNX); alphaCY = calcAlphaC(lambdaNY) — imported from compressionCapacity.ts
- phiNcX = 0.9 × alphaCX × kf × Ag × fy / 1000 (kN)
- phiNcY = 0.9 × alphaCY × kf × Ag × fy / 1000 (kN)
- phiNc = min(phiNcX, phiNcY)
- sectionClass + ZeX + ZeY: reuse calcSectionClass + calcZe from momentCapacity.ts
- phiMsx = 0.9 × ZeX × fy / 1e6 (kN.m); phiMsy = 0.9 × ZeY × fy / 1e6 (kN.m)
- LTB: hollow → phiMbx = phiMsx; UC → reuse momentCapacity.ts with LeX × 1000 as LTB Le (mm)
- nStar = max(1.2G + 1.5Q, G) kN
- mStarX = nStar × ey / 1000 (kN.m); mStarY = nStar × ex / 1000 (kN.m)
- ratioSection = nStar/phiNs + mStarX/phiMsx + mStarY/phiMsy (Cl. 8.3.3)
- ratioMemberInplane = nStar/phiNc + mStarX/phiMsx (Cl. 8.4.2)
- ratioMemberOutofplane = nStar/phiNc + mStarX/phiMbx (Cl. 8.4.4)
- passes.overall = AND of all 8 individual pass/fail values

**Note:** Verify actual export signatures in `momentCapacity.ts` and `compressionCapacity.ts` before
implementing. If calcAlphaC is not exported from compressionCapacity.ts, export it. Adapt call
signatures to match actual source.

## Critic checklist (card-specific)
- `src/types/column.ts` created with `ColumnInputs`, `ColumnResults`, `ColumnIntermediates`
- `ColumnInputs.steelGrade` accepts both `SteelGrade` (UC) and `HollowSteelGrade` (SHS/RHS/CHS)
- `calcFyHollow` added to `sectionUtils.ts`; returns 250/350/450 for C250/C350/C450 (flat, AS1163)
- `evaluateColumn` returns all 8 pass/fail checks from HANDOVER §4.3
- nStar formula: `max(1.2G + 1.5Q, G)` — NOT just `1.2G + 1.5Q`
- mStarX = nStar × ey / 1000 (ey in mm → kN.m); mStarY = nStar × ex / 1000
- LeX, LeY stored in metres in intermediates (for display); converted to mm for slenderness calc
- `calcAlphaC` imported from `compressionCapacity.ts` (reused, not duplicated)
- UC LTB: reuses `momentCapacity.ts`; hollow: `phiMbx = phiMsx` (no LTB)
- `kf = 1.0` per HANDOVER §4.3.2
- `passes.overall` = AND of all 8 individual pass/fail values
- No `any` or `@ts-ignore`; no new npm packages

## Verification (no browser check for this card — pure logic)

Spot-check: 200UC52.2, L = 4m, k_x = k_y = 1.0, G = 200 kN, Q = 150 kN, e_y = 50 mm, Grade 350.

Expected approximate values (hand-check before CRITIC_REVIEW):
- fy = 340 MPa (tf approx 12.5 mm, 11 < tf <= 17 → G350 gives 340 MPa per calcFy)
- N* = max(1.2×200 + 1.5×150, 200) = max(465, 200) = 465 kN
- M*x = 465 × 50 / 1000 = 23.25 kN.m; M*y = 0 (ex = 0)
- phiNs = 0.9 × Ag × 340 / 1000 (check against section DB Ag for 200UC52.2)
- lambdaN_x = (4000 / rX) × sqrt(1.0 × 340 / 250) — verify rX from section DB
- Record results in History block

## History
(append-only)
```

---

### `.nova/cards/5R3.md` — Column components + hook (Item 4b)

```markdown
# 5R3 — Column components + hook (Item 4b)

## STATUS
- Column: BACKLOG (becomes READY when 5R2 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 4 (components + hook) — ColumnGeometryPanel, ColumnLoadPanel,
  ColumnResultsPanel (no PDF yet), useColumnCalculations hook; replace ColumnApp.tsx stub

## Files owned
- `src/components/ColumnGeometryPanel.tsx` (NEW FILE)
- `src/components/ColumnLoadPanel.tsx` (NEW FILE)
- `src/components/ColumnResultsPanel.tsx` (NEW FILE — PDF Export button disabled/stubbed)
- `src/hooks/useColumnCalculations.ts` (NEW FILE)
- `src/ColumnApp.tsx` (REPLACE stub with full implementation)

## Implementation notes

### useColumnCalculations.ts
```tsx
import { useMemo } from 'react';
import type { ColumnInputs, ColumnResults } from '@/types/column';
import { evaluateColumn } from '@/engineering/as4100/columnCapacity';

export function useColumnCalculations(inputs: ColumnInputs): ColumnResults {
  return useMemo(() => evaluateColumn(inputs), [inputs]);
}
```

### ColumnApp.tsx (replace stub)
Mirrors App.tsx beam section: holds ColumnInputs state, passes to panels.
Default inputs: height=4, sectionType='UC', steelGrade='G300', section=first UC by mass,
kx=1.0, ky=1.0, G=0, Q=0, ex=0, ey=0.
Layout: 40% left (ColumnGeometryPanel + ColumnLoadPanel) / 60% right (ColumnResultsPanel),
matching the beam tab split. Accept className prop and apply to root div.

### ColumnGeometryPanel.tsx
Fields per HANDOVER §4.1 Geometry panel:
- Height (m) number input
- Section type dropdown: UC / SHS / RHS / CHS
- Steel grade dropdown — conditional on section type:
  - UC → "Grade 300" / "Grade 350" (SteelGrade values 'G300' / 'G350')
  - SHS/RHS/CHS → "Grade 250" / "Grade 350" / "Grade 450" (HollowSteelGrade values)
  - On section type change: reset grade to UC→'G300'; hollow→'C350'
- Section size dropdown — getSectionsByType(type), sorted ascending by mass
- Auto-select lightest button — iterate ascending by mass; first passing section wins;
  green message "X selected (lightest passing)" or red "No passing section found"
- k_x input (default 1.0)
- k_y input (default 1.0)
- Read-only Le_x, Le_y displays: kx×height m and ky×height m

### ColumnLoadPanel.tsx
Fields per HANDOVER §4.1 Load panel:
- G (kN) number input
- Q (kN) number input
- e_x (mm) number input (default 0)
- e_y (mm) number input (default 0)
- Read-only computed display: N*, M*x, M*y (read from results prop)

### ColumnResultsPanel.tsx
Per HANDOVER §4.4:
- Capacity check table (8 rows; bending rows hidden when M* = 0):
  - Axial — Section (phiNs): N* kN | phiNs kN | util% | PASS/FAIL
  - Axial — Member x (phiNc_x): N* kN | phiNcX kN | util% | PASS/FAIL
  - Axial — Member y (phiNc_y): N* kN | phiNcY kN | util% | PASS/FAIL
  - Bending x — Section (phiMsx): M*x kN.m | phiMsx kN.m | util% | PASS/FAIL (hidden if M*x=0)
  - Bending y — Section (phiMsy): M*y kN.m | phiMsy kN.m | util% | PASS/FAIL (hidden if M*y=0)
  - Combined — Section (Cl. 8.3.3): ratio | <=1.00 | util% | PASS/FAIL
  - Combined — Member in-plane (Cl. 8.4.2): ratio | <=1.00 | util% | PASS/FAIL
  - Combined — Member out-of-plane (Cl. 8.4.4): ratio | <=1.00 | util% | PASS/FAIL
- Summary line below table: "Section class: X · fy = Y MPa · Le_x = Z m · Le_y = Z m"
- N*–M* interaction diagram (Recharts LineChart):
  - Governing axis: x if M*x >= M*y, else y
  - Section envelope: straight line from (phiMs_gov, 0) to (0, phiNs)
  - Member envelope: straight line from (phiMb_gov, 0) to (0, phiNc)
  - Design point dot at (M*_gov, N*)
  - Both lines green if design point inside both envelopes; red if outside
  - Title: "N*-M*x Interaction (AS4100 Cl. 8.3/8.4)" or y-axis equivalent
- "Export PDF" button — disabled stub "(PDF export — coming in 5R4)" until 5R4 wires it up

## Critic checklist (card-specific)
- `useColumnCalculations.ts` wraps `evaluateColumn` in `useMemo`; inputs as dependency
- `ColumnApp.tsx` replaces stub; holds `ColumnInputs` state; 40/60 layout matching beam tab
- Grade dropdown conditional on section type; resets grade on type change (UC→'G300'; hollow→'C350')
- Auto-select: iterates by mass ascending, first passing section; green/red message below button
- `ColumnLoadPanel`: N*, M*x, M*y shown as read-only computed values from results prop
- `ColumnResultsPanel`: bending rows absent from DOM (not just hidden) when M* = 0
- Interaction chart: two capacity lines + design point; title reflects governing axis
- Both capacity lines change colour based on whether design point is inside envelope
- PDF Export button present but disabled (5R4 not yet implemented)
- No `any`, no `@ts-ignore`, no new npm packages

## Visual confirmation steps (Test Validator — browser MCP required)

1. Ensure dev server running at `http://localhost:5173`.
2. Navigate and click "Steel Column" tab.
3. Take full-page screenshot (`5R3-column-tab-default.png`) — confirm full column UI (not stub).
4. Confirm geometry inputs visible: Height, Section type, Grade, Section size, k_x, k_y, Le_x, Le_y.
5. Set: Height=4m, Section type=UC, Grade=Grade 300, section=200UC52.2, k_x=k_y=1.0.
6. Set: G=200 kN, Q=150 kN, e_y=50 mm (e_x=0).
7. Take screenshot of results panel (`5R3-column-results.png`) — confirm capacity table with rows:
   - 3 axial rows always visible
   - Bending x row visible (M*x > 0 since e_y=50mm)
   - Bending y row absent (M*y = 0 since e_x=0)
   - 3 combined rows always visible
8. Confirm N* displayed approx 465 kN; M*x approx 23.25 kN.m in load panel read-only display.
9. Take screenshot of interaction chart (`5R3-interaction-chart.png`) — confirm N*-M*x chart with
   two capacity lines and a design point dot visible.
10. Click "Auto-select lightest" — confirm section selected or no-result message shown.
11. Switch section type to "SHS" — confirm grade dropdown changes to 250/350/450 options.
12. Switch back to "Steel Beam" tab — confirm beam state still intact (span unchanged).
13. Switch back to "Steel Column" — confirm column state preserved.

## History
(append-only)
```

---

### `.nova/cards/5R4.md` — Column PDF export (Item 4c)

```markdown
# 5R4 — Column PDF export (Item 4c)

## STATUS
- Column: BACKLOG (becomes READY when 5R3 DONE)
- Agent: (unassigned)
- Critic verdict: (pending)
- TV result: (pending)
- Evidence: (pending)

## Items implemented
- HANDOVER Item 4 (PDF export) — 3-page jsPDF column export; wire up PDF button in ColumnResultsPanel

## Files owned
- `src/utils/columnPdfExport.ts` (NEW FILE)
- `src/components/ColumnResultsPanel.tsx` (wire up PDF button only)

## Implementation notes

### columnPdfExport.ts (NEW FILE)
3-page A4 jsPDF export per HANDOVER §4.6. Follow exact same coding conventions as `pdfExport.ts`:
- No external charting libraries — use jsPDF line drawing for all diagrams
- ASCII only: no phi, lambda, squared, sqrt, <= Unicode — use "phi", "lambda", "sqrt", "<="
- y > 270 overflow guard with addPage() + y = 10 reset
- Same font sizes and line heights as beam export

**Page 1 — Inputs + properties + check table**
- Job block (if jobNumber/jobName provided as args)
- Design inputs: height, section designation, grade, fy, k_x, k_y, Le_x, Le_y, G, Q, N*, e_x, e_y, M*x, M*y
- Section properties: Ag, Ix, Iy, rx, ry (+ J, Iw for UC if available in section DB)
- Capacity check table (8 rows matching the UI table)

**Page 2 — Interaction diagram**
- N*-M* interaction diagram for governing axis using jsPDF line drawing
- Draw section envelope (straight line), member envelope (straight line), design point (filled circle)
- Title: "N*-M*x Interaction Diagram (AS4100)" or y-axis equivalent
- Axis labels: "M* (kN.m)", "N* (kN)"

**Page 3 — Calculation sheet**
13 numbered steps with AS clause tags per HANDOVER §4.6:
1. Steel grade + fy [AS3678 / AS1163]
2. Section classification [AS4100 Cl. 5.2.2]
3. Ze_x, Ze_y [AS4100 Cl. 5.2.3-5.2.5]
4. phi*Msx, phi*Msy [AS4100 Cl. 5.2.1]
5. LTB: UC shows Moa/alphas/phi*Mbx working; hollow shows "No LTB - closed section" [AS4100 Cl. 5.6]
6. Factored loads N*, M*x, M*y [AS1170.1]
7. kf, phi*Ns [AS4100 Cl. 6.2.1-6.2.2]
8. lambda_n_x, alpha_c_x, phi*Nc_x [AS4100 Cl. 6.3.3]
9. lambda_n_y, alpha_c_y, phi*Nc_y [AS4100 Cl. 6.3.3]
10. Combined - section Cl. 8.3.3 [AS4100 Cl. 8.3.3]
11. Combined - member in-plane Cl. 8.4.2 [AS4100 Cl. 8.4.2]
12. Combined - member out-of-plane Cl. 8.4.4 [AS4100 Cl. 8.4.4]
13. Overall result

### ColumnResultsPanel.tsx — wire up PDF button
Replace disabled stub with working onClick calling `exportColumnToPDF(inputs, results, jobNumber, jobName)`.
Accept `jobNumber` and `jobName` as optional props passed from ColumnApp.tsx.
ColumnApp.tsx should receive jobNumber/jobName props from App.tsx (App.tsx manages both beam and column job fields).

## Critic checklist (card-specific)
- `columnPdfExport.ts` is a NEW file; `pdfExport.ts` is NOT modified
- ASCII only: no phi, lambda, ², sqrt, <= characters in PDF output — spelled-out equivalents only
- y > 270 overflow guard present throughout page 3 calc sheet
- Page 1: all design input fields + section properties + 8-row check table
- Page 2: interaction diagram drawn with jsPDF lines (not canvas screenshot or external lib)
- Page 2: design point rendered (filled circle or cross) at (M*_gov, N*)
- Page 3: all 13 numbered steps with AS clause annotations in brackets
- Page 3: LTB step 5 shows "No LTB - closed section" for hollow; full Moa working for UC
- `ColumnResultsPanel.tsx`: only the PDF button onClick wired up; no other structural changes
- `pdfExport.ts` untouched (beam PDF unaffected)

## Visual confirmation steps (Test Validator — browser MCP required)

1. Ensure dev server running at `http://localhost:5173`.
2. Navigate to Steel Column tab.
3. Configure: Height=5m, UC, Grade 350, 200UC52.2, k_x=k_y=1.0, G=300 kN, Q=200 kN, e_y=30mm.
4. Click "Export PDF" button — confirm PDF downloads (3 pages).
5. Take screenshot of PDF page 1 (`5R4-pdf-page1.png`) — confirm inputs, section properties, 8-row
   check table present with no text overlap.
6. Take screenshot of PDF page 2 (`5R4-pdf-page2.png`) — confirm N*-M* interaction diagram with
   two capacity lines and design point drawn.
7. Take screenshot of PDF page 3 (`5R4-pdf-page3.png`) — confirm 13 numbered steps, AS clause
   tags in brackets, no Unicode symbols (phi, lambda, etc.).
8. Switch to an SHS section with Grade 450: confirm page 3 step 5 shows "No LTB - closed section".
9. Beam regression: switch to beam tab, export PDF — confirm beam PDF still 3 pages, correct layout.

## History
(append-only)
```

---

### `.nova/cards/5I1.md` — Integration + final visual QA

```markdown
# 5I1 — Integration + final visual QA

## STATUS
- Column: BACKLOG (becomes READY when 5R4 DONE)
- Agent: (unassigned)
- TV result: (pending)
- Evidence: (pending)

## Purpose
Final end-to-end verification of all Rev 5 changes. No code changes permitted. Confirms all
HANDOVER.md verification gates for all 5 cards are met in a single integrated session.

## Verification gates (from HANDOVER.md)

| Card | Gate |
|------|------|
| 5R0 | McVeigh theme: Restraints toggle inactive button dark text; Recharts axis labels readable; PDF page 2 BMD peak points downward |
| 5R1 | Both tabs clickable; Steel Beam state preserved on tab switch |
| 5R2 | evaluateColumn spot-check: 200UC52.2, L=4m, G=200 kN, Q=150 kN, e_y=50mm, G350 → N*=465 kN, correct phi*Ns/phi*Nc/phi*Msx |
| 5R3 | Column tab: inputs update live; 8-row table; interaction chart renders; auto-select works |
| 5R4 | Column PDF: 3 pages; page 1 inputs+table; page 2 interaction diagram with design point; page 3 calc sheet with AS clause tags |

Plus standard gates:
- `npx tsc --noEmit` — 0 errors
- `npm run build` — clean build

## Browser MCP confirmation procedure (required — all steps)

1. Run `npx tsc --noEmit` and `npm run build` — confirm 0 errors and clean build.
2. Navigate to `http://localhost:5173`. Take full-page screenshot (`5I1-default.png`).
3. **5R0 — McVeigh text fix:**
   - Switch to McVeigh theme.
   - Confirm Restraints panel Simple/Advanced toggle: inactive button has dark text on white.
   - Load a beam with loads; confirm Recharts axis labels and legend text are dark and readable.
   - Take screenshot (`5I1-mcveigh-recharts.png`).
4. **5R0 — PDF BMD orientation:**
   - Export beam PDF (e.g. 360UB44.7, 8m, 20 kN/m G UDL, Pin-Pin).
   - Open page 2 — confirm BMD peak points downward (sagging convention).
   - Take screenshot (`5I1-pdf-bmd.png`).
5. **5R1 — Tab navigation + state preservation:**
   - Confirm two tabs: "Steel Beam" and "Steel Column".
   - Enter span = 12.5m in beam tab.
   - Switch to Steel Column tab — confirm full column UI (not stub).
   - Switch back to Steel Beam — confirm span still 12.5m (state preserved).
   - Take screenshot (`5I1-beam-state.png`).
6. **5R3 — Column tool full flow:**
   - Set 200UC52.2, L=4m, k_x=k_y=1.0, G=200 kN, Q=150 kN, e_y=50mm, G350.
   - Confirm N* approx 465 kN, M*x approx 23.25 kN.m displayed.
   - Take screenshot of results (`5I1-column-results.png`) — all rows present.
   - Confirm interaction chart renders with two capacity lines and design point.
   - Click "Auto-select lightest" — confirm response.
   - Switch to SHS; confirm grade dropdown shows 250/350/450.
   - Take screenshot (`5I1-column-shs.png`).
7. **5R4 — Column PDF:**
   - Export column PDF with UC (G=300 kN, Q=200 kN, e_y=30mm, G350, L=5m).
   - Confirm 3-page PDF. Take screenshots of all 3 pages.
   - Page 1: inputs, section properties, 8-row table — no text overlap.
   - Page 2: interaction diagram with two lines + design point.
   - Page 3: 13 numbered steps, AS clause tags, no Unicode symbols.
   - Repeat with SHS section — confirm "No LTB - closed section" on page 3 step 5.
8. **Beam regression:**
   - Switch to Steel Beam, export PDF — confirm 3-page beam PDF, correct BMD orientation.
   - Take screenshot (`5I1-beam-pdf-regression.png`).

Record all screenshot paths in STATUS Evidence block. Save to `.nova/evidence/rev5/`.

## History
(append-only)
```

---

## Journal Entry to Append

Append to `journal.md` at the bottom:

```markdown
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
```

---

## End-to-End Verification (after 5I1)

1. `npx tsc --noEmit` → 0 errors in `steel-beam-tool/`
2. `npm run build` → clean build
3. McVeigh theme: Recharts axis labels readable (dark fill); Restraints toggle inactive button has dark text
4. Both tabs clickable; beam state preserved when switching to column and back
5. PDF BMD: sagging peak points downward (post 5R0 sign fix)
6. Column tab: inputs update live; 8-row capacity table; interaction chart renders
7. Column auto-select: responds with first passing section or no-result message
8. Grade conditional on section type: UC→G300/G350; SHS/RHS/CHS→C250/C350/C450
9. Column PDF: 3 pages; inputs on page 1; interaction diagram on page 2 with design point; calc sheet on page 3 with AS clause tags
10. Column PDF calc sheet: ASCII only (no Unicode phi, lambda, sqrt, <=); all 13 steps present
11. Hollow section PDF: "No LTB - closed section" on step 5; UC PDF: full LTB working
12. Beam PDF regression: still exports correctly with 3 pages; BMD orientation correct (sagging down)

---

## Files to Create / Modify During Execution

### Planning deliverables (before any implementation)
| Action | Path |
|--------|------|
| Save   | `.nova/REV5-ORCHESTRATION-PLAN.md` |
| Update | `.nova/KANBAN.md` |
| Create | `.nova/cards/5R0.md` |
| Create | `.nova/cards/5R1.md` |
| Create | `.nova/cards/5R2.md` |
| Create | `.nova/cards/5R3.md` |
| Create | `.nova/cards/5R4.md` |
| Create | `.nova/cards/5I1.md` |
| Update | `journal.md` |

**After saving planning deliverables: PAUSE. Do not proceed to implementation.**

### Source changes (per card, during implementation)
| Card | Files |
|------|-------|
| 5R0 | `src/index.css`, `src/components/RestraintPanel.tsx`, `src/utils/pdfExport.ts` |
| 5R1 | `src/App.tsx`, `src/ColumnApp.tsx` (NEW) |
| 5R2 | `src/types/column.ts` (NEW), `src/engineering/as4100/columnCapacity.ts` (NEW), `src/engineering/sections/sectionUtils.ts`, `src/types/index.ts` |
| 5R3 | `src/components/ColumnGeometryPanel.tsx` (NEW), `src/components/ColumnLoadPanel.tsx` (NEW), `src/components/ColumnResultsPanel.tsx` (NEW), `src/hooks/useColumnCalculations.ts` (NEW), `src/ColumnApp.tsx` |
| 5R4 | `src/utils/columnPdfExport.ts` (NEW), `src/components/ColumnResultsPanel.tsx` |

---

## Critical Non-Clobber Rules

- `types/index.ts`: extend with `HollowSteelGrade` — never remove any existing type
- `sectionUtils.ts`: `calcFy` signature unchanged; `calcFyHollow` is a new export (additive only)
- `App.tsx`: only `activeTab` state and nav bar change; beam layout and beam state untouched
- `pdfExport.ts`: only the `drawDiagram` Y formula sign change (5R0 Item 3); page layout unchanged
- `compressionCapacity.ts`: read-only (import `calcAlphaC`; never modify)
- `momentCapacity.ts`, `shearCapacity.ts`, `evaluate.ts`: read-only (column tool imports, never modifies)
