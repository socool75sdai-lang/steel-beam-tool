# Rev 2 Orchestration Plan — Steel Beam Design Tool

## Context

The handover document at `.Improvements\Rev 2\HANDOVER.md` specifies 7 improvements to the McVeigh Steel Designer app (React 18 + TypeScript + Vite, client-side, `localhost:5173`). The existing `.nova/` system defines a Kanban pull model with agent roles (Implementer, Critic, Test Validator, Integrator) that we extend here for Rev 2. All 7 items map cleanly onto 5 parallel implementation cards with zero file conflicts — every card owns completely disjoint files. This enables a single-wave parallel execution followed by a sequential integration pass.

---

## File Analysis & Card Grouping

| Card | Items (from HANDOVER.md) | Files Owned |
|---|---|---|
| **R1** | #1 Leading-zeros onBlur — GeometryPanel + LoadPanel | `src/components/GeometryPanel.tsx`, `src/components/LoadPanel.tsx` |
| **R2** | #1 Leading-zeros onBlur — RestraintPanel; #6 Count-based intermediate spacing | `src/components/RestraintPanel.tsx` |
| **R3** | #5 Capacity reference lines always display | `src/components/ResultsPanel.tsx` |
| **R4** | #2 McVeigh logo; #3 Rename h1; #4 Tab bar; #7 Span-sync loads | `src/App.tsx`, `public/logo.jpg` (copy from `.Improvements\Rev 2\2.jpg`) |
| **R5** | #3 Rename `<title>` + PDF header | `index.html`, `src/utils/pdfExport.ts` |

No file appears in more than one card. All 5 cards can be dispatched in parallel on separate worktree branches.

---

## Orchestration Architecture

Extends the existing `.nova/ORCHESTRATION-PLAN.md` Kanban pull model. Columns:

```
BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE (or BLOCKED)
```

**Wave 1:** Cards R1–R5 all start READY and run in parallel (5 separate implementers or sequential with worktree isolation).

**Integration pass:** After all R1–R5 reach DONE, Integrator merges all branches into `main` (R1 → R2 → R3 → R4 → R5 order), runs `tsc --noEmit` + `npm run build` after each merge, then performs final browser visual confirmation.

---

## Worktree Branches

| Card | Branch | Worktree path |
|---|---|---|
| R1 | `rev2/r1-blur-fix-geometry-load` | `steel-beam-tool-wt\r1-blur-fix\` |
| R2 | `rev2/r2-restraint-blur-count` | `steel-beam-tool-wt\r2-restraint\` |
| R3 | `rev2/r3-reference-lines` | `steel-beam-tool-wt\r3-ref-lines\` |
| R4 | `rev2/r4-app-branding` | `steel-beam-tool-wt\r4-app\` |
| R5 | `rev2/r5-rename-html-pdf` | `steel-beam-tool-wt\r5-rename\` |

Worktrees root: `C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool-wt\`

---

## Agent Roles

### Implementer
**Pull condition:** Card is READY, no card currently IN_PROGRESS for this agent.
**Must:** Create worktree branch from current `main`, implement per HANDOVER.md spec exactly (code patterns are prescriptive), self-verify `npx tsc --noEmit` + `npm run build` in their worktree before marking CRITIC_REVIEW.
**Must NOT:** Modify files outside Files Owned; use `any` or `@ts-ignore`; install packages.
**Commit format:** `rev2(RX): <present-tense description>`

### Critic
**Pull condition:** Card is CRITIC_REVIEW with a commit hash recorded.
**Task:** Reviews implementation against HANDOVER.md spec. Issues APPROVED or CHANGES_REQUESTED with specific file + line defect descriptions. Never implements fixes. Sequential review checklist:
1. Scope — only Files Owned modified
2. Spec conformance — every sub-item in the HANDOVER.md section addressed
3. TypeScript hygiene — no `any`, no suppressions, no unused imports added
4. Pattern fidelity — `onBlur` fires same callback as `onChange` (R1/R2); positions use `parseFloat(((span/(n+1))*(i+1)).toFixed(3))` (R2); `ReferenceLine` guards check `results !== null` not pass/fail flags (R3); `handleChange` uses functional update form (R4/R7)
5. Logo constraint — `h-10 w-auto` class, `src="/logo.jpg"`, alt text present (R4)
6. Tab bar spec — `var(--mc-green-mid)` background, `var(--mc-gold)` border-bottom, `-mb-px` offset trick (R4)
7. Non-clobber — no prior enhancements removed (reference lines still there in R3, theme system intact in R4)

**Cycle limit:** Max 2 CHANGES_REQUESTED cycles. Cycle 2 failure → BLOCKED, escalate to user.

### Test Validator
**Pull condition:** Card is QA with APPROVED in STATUS block.
**Step 1 — Automated checks:** Run `npx tsc --noEmit` and `npm run build` in the card's worktree. FAIL → return to IN_PROGRESS with exact error output.
**Step 2 — Browser visual confirmation (required for QA PASS):**

Navigate to `http://localhost:5173` (dev server must be running in the worktree). Use Playwright MCP (`mcp__playwright__browser_navigate`, `mcp__playwright__browser_fill_form`, `mcp__playwright__browser_take_screenshot`, `mcp__playwright__browser_snapshot`) to confirm each item:

| Card | Visual confirmation steps |
|---|---|
| **R1** | Navigate to app. Fill Span field with `010`. Click away (trigger blur). Take screenshot. Confirm span field shows `10` with no leading zero. Repeat with a LoadPanel field (e.g. start = `05`). |
| **R2** | In RestraintPanel toggle to Advanced mode. Set "Number of intermediate restraints" to `3`. Confirm "Positions: 2.50 m, 5.00 m, 7.50 m" (for 10 m span) appears. Take screenshot. Set count to `0`, confirm positions text disappears. |
| **R3** | Ensure a section and loads are configured so `results` is non-null. Navigate to results panel. Take screenshot. Confirm φMbx and φMs lines visible on BMD chart, ±φVv lines on SFD chart, L/300 and L/360 lines on Deflection chart. Check these lines are present regardless of pass/fail state (set loads to near-fail). |
| **R4** | Navigate to app. Take screenshot of header. Confirm McVeigh logo image appears (not SVG placeholder), h1 reads "McVeigh Steel Designer", tab bar "Steel Beam" visible below header with gold underline. Change Span to 12m, confirm all Line/Area load `End` fields auto-update to 12. |
| **R5** | Check browser tab title reads "Steel Designer". Click "Export PDF" button. In the downloaded/opened PDF confirm the report header reads "McVeigh Steel Designer". Take screenshot of PDF viewer if possible. |

**On visual PASS:** Moves card to DONE. Records screenshot filename in card STATUS block.
**On visual FAIL:** Returns card to IN_PROGRESS with annotated screenshot path and defect description. After 2 failures → BLOCKED.

### Integrator
**Acts when:** All 5 cards in DONE, or any card BLOCKED.
**Merge order:** R1 → R2 → R3 → R4 → R5 into `main`. After each merge: `npx tsc --noEmit`, `npm run build`. Abort and BLOCK on any error.
**Cleanup after each merge:**
```powershell
git worktree remove "..\steel-beam-tool-wt\<branch-slug>"
git branch -d "rev2/<branch-slug>"
```
**Final verification (browser MCP):** After all merges:
- Take full-page screenshot of `http://localhost:5173`
- Confirm: McVeigh logo + "McVeigh Steel Designer" h1 + "Steel Beam" tab bar in header
- Confirm: BMD/SFD/Deflection reference lines visible
- Confirm: Span-to-End sync working (change Span, observe Load panel End fields)
- Confirm: Advanced restraints show count input (no position list)
- Take screenshot, attach to Integration card STATUS block as PASS evidence

---

## Kanban Board Setup

**Create `.nova/KANBAN.md`** with 5 Rev 2 implementation cards + 1 integration card:

```
| Card | Title | Column | Branch |
|------|-------|--------|--------|
| R1 | Leading-zeros blur fix (Geometry + Load panels) | READY | rev2/r1-blur-fix-geometry-load |
| R2 | Restraint panel — blur fix + count-based spacing | READY | rev2/r2-restraint-blur-count |
| R3 | Capacity reference lines always display | READY | rev2/r3-reference-lines |
| R4 | App branding — logo, rename, tab bar, span-sync | READY | rev2/r4-app-branding |
| R5 | Rename: index.html title + PDF report header | READY | rev2/r5-rename-html-pdf |
| I1 | Integration — merge all branches + final visual QA | BACKLOG | (main) |
```

I1 becomes READY when R1–R5 all reach DONE.

Each card file (`cards/R1.md` through `cards/I1.md`) contains:
- STATUS block: column, assigned agent, commit hash, Critic verdict, Critic cycle count, TV result, screenshot evidence
- Items implemented (HANDOVER.md section numbers)
- Files owned
- Acceptance checklist (derived from HANDOVER.md spec)
- History log (append-only)

---

## Implementation Detail per Card

### R1 — GeometryPanel.tsx + LoadPanel.tsx
Apply `onBlur={(e) => updateFoo({ field: parseFloat(e.target.value) || 0 })}` to every `type="number"` input. `onChange` handler is unchanged. Inputs in scope:
- GeometryPanel.tsx: Span, Tributary width, Le/L multiplier
- LoadPanel.tsx: all magnitude, position, start, end fields for Point, Line, Area loads

### R2 — RestraintPanel.tsx
Two changes in one file:
1. Add `onBlur` to all existing `type="number"` inputs (restraint positions, αm override)
2. Replace intermediate position list with:
   - Local `const [intermediateCount, setIntermediateCount] = useState(0)` (not in DesignInputs)
   - `computedPositions` derived as `Array.from({ length: intermediateCount }, (_, i) => parseFloat(((inputs.span / (intermediateCount + 1)) * (i + 1)).toFixed(3)))`
   - `useEffect(() => { updateRestraint({ intermediate: computedPositions }); }, [intermediateCount, inputs.span])`
   - Count input with `min={0}`, `step={1}`, `onChange` and `onBlur` both call `Math.max(0, parseInt(e.target.value) || 0)`
   - Conditional `<p>Positions: ...</p>` only when `intermediateCount > 0`
   - Remove: `addIntermediate`, `updateInterm`, `removeInterm`, `+ Add` button, mapped position input list

### R3 — ResultsPanel.tsx
Audit every `<ReferenceLine>` in the file. Remove any conditional wrapper other than `results !== null`. The six required lines (φMbx, φMs, +φVv, −φVv, L/300, L/360) must render whenever `results` is non-null, regardless of pass/fail flags. Stroke colour uses pass/fail flags; presence does not.

### R4 — App.tsx + public/logo.jpg
Four changes, all in App.tsx plus one file copy:
1. **Logo:** Copy `.Improvements\Rev 2\2.jpg` → `public/logo.jpg`. Replace inline `<svg>` block in header with `<img src="/logo.jpg" alt="McVeigh Consultants" className="h-10 w-auto" />`
2. **Rename h1:** Change `<h1>` text to `"McVeigh Steel Designer"`
3. **Tab bar:** Insert `<nav>` between `<header>` and the flex-1 content div (exact JSX from HANDOVER.md §4 spec)
4. **Span sync:** Replace `handleChange` with functional update that syncs line/area load `end` fields when `patch.span !== undefined`

### R5 — index.html + pdfExport.ts
- `index.html`: Change `<title>` to `"Steel Designer"`
- `pdfExport.ts`: Change the report header string to `"McVeigh Steel Designer"`; no other changes to layout or diagram draw logic

---

## Dependency Gate Registry

| Card | Becomes READY when |
|---|---|
| R1–R5 | Immediately (no dependencies) |
| I1 | All of R1, R2, R3, R4, R5 in DONE |

---

## Pre-execution Setup Steps

When execution begins, perform these actions first:

1. **Create `.nova/KANBAN.md`** — board with R1–R5 in READY, I1 in BACKLOG
2. **Create card files** — `.nova/cards/R1.md` through `.nova/cards/I1.md`
3. **Update `journal.md`** — append entry: `## 2026-05-26 — Rev 2 Orchestration Planned` with summary of 7 items, 5 cards, kanban + critic/validator/browser-MCP approach
4. **Verify dev server** is running at `localhost:5173` before dispatching any Test Validator

---

## Verification (End-to-End)

After all merges complete on `main`:

1. `npx tsc --noEmit` → 0 errors
2. `npm run build` → clean build, no warnings
3. Browser MCP full check at `http://localhost:5173`:
   - Header: McVeigh logo image (not SVG) visible
   - Header h1: "McVeigh Steel Designer"
   - Tab bar: "Steel Beam" tab with gold underline below header
   - Enter "010" in Span → blurs to "10" (no leading zero)
   - Change Span → all Line/Area load End fields update
   - Advanced restraints: count input present, position list absent
   - Results charts: φMbx + φMs on BMD, ±φVv on SFD, L/300 + L/360 on Deflection — all visible
   - Browser tab title: "Steel Designer"
4. PDF export: report header reads "McVeigh Steel Designer"

---

## Critical Non-Clobber Rules

- R4 must not remove the theme switcher/dropdown or the McVeigh CSS custom properties (`--mc-green-dark` etc.)
- R3 must not remove the deflection chart added in the prior session (per journal.md 2026-05-25)
- R2 must keep the End A / End B dropdowns in Advanced mode unchanged
- R5 must not change any diagram draw logic in `pdfExport.ts` — only the header string

---

## Files to Create / Modify During Execution

| Action | Path |
|---|---|
| Create | `.nova/KANBAN.md` |
| Create | `.nova/cards/R1.md` through `.nova/cards/I1.md` |
| Update | `journal.md` |
| Copy | `.Improvements\Rev 2\2.jpg` → `steel-beam-tool\public\logo.jpg` |
| Edit | `steel-beam-tool\src\App.tsx` |
| Edit | `steel-beam-tool\index.html` |
| Edit | `steel-beam-tool\src\utils\pdfExport.ts` |
| Edit | `steel-beam-tool\src\components\GeometryPanel.tsx` |
| Edit | `steel-beam-tool\src\components\LoadPanel.tsx` |
| Edit | `steel-beam-tool\src\components\RestraintPanel.tsx` |
| Edit | `steel-beam-tool\src\components\ResultsPanel.tsx` |
