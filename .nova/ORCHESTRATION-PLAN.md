# Phase 2 Orchestration Plan — Steel Beam Design Tool

## Context

The Steel Beam Design Tool at `C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool\` is a working React 18 + TypeScript + Vite app. Phase 2 adds 6 enhancements (7 work items) specified in `.handover/phase2-spec.md`. A phase 1 orchestration already exists at `.orchestration/` using a linear wave-push model. This plan defines a **novel orchestration** using a **Kanban pull model** stored at `.nova/`, with git worktrees for parallel isolation, and three new gating roles: Critic, Test Validator, and Integrator.

---

## Architecture: Kanban Pull vs. Wave Push

The existing `.orchestration/` system pushes work at agents in waves — an orchestrator broadcasts and waits. The `.nova/` system is a pull model: cards sit in columns and agents pull when conditions are met. Feedback loops are built in (Critic can send work back). No orchestrator is needed. The human is only involved on escalation (BLOCKED cards).

**Columns:** `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → BLOCKED → DONE`

---

## Worktree Decision: YES

Git worktrees isolate parallel work without file conflicts. The repo has a single initial commit (`dad478c`) on `main`.

| Card | Branch | Worktree path | Reason |
|---|---|---|---|
| C000 | none | none | Research only — no source files |
| C001 | `phase2/c001-load-headers` | `steel-beam-tool-wt\c001-load-headers\` | Parallel with C002/C003 |
| C002 | `phase2/c002-auto-select` | `steel-beam-tool-wt\c002-auto-select\` | Parallel with C001/C003 |
| C003 | `phase2/c003-ref-lines` | `steel-beam-tool-wt\c003-ref-lines\` | Parallel with C001/C002 |
| C004 | `phase2/c004-deflection` | `steel-beam-tool-wt\c004-deflection\` | Parallel with C005; touches types/index.ts (non-overlapping) |
| C005 | `phase2/c005-wb-build` | `steel-beam-tool-wt\c005-wb-build\` | Parallel with C004; touches types/index.ts (non-overlapping) |
| C006 | none | none | Sequential on main — runs after all merges complete |

Worktrees live OUTSIDE the main working tree to avoid nested repo issues:
`C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool-wt\<branch-slug>\`

---

## Files to Create

All files go under `C:\Users\socoo\.projects\01 Steel Beam\.nova\`

```
.nova/
├── ORCHESTRATION-PLAN.md   ← this file
├── KANBAN.md
├── RULES.md
├── agents/
│   ├── researcher.md
│   ├── implementer.md
│   ├── critic.md
│   ├── test-validator.md
│   └── integrator.md
└── cards/
    ├── C000-wb-research.md
    ├── C001-load-panel-headers.md
    ├── C002-auto-select-feedback.md
    ├── C003-capacity-reference-lines.md
    ├── C004-deflection-chart-pdf.md
    ├── C005-wb-section-build.md
    └── C006-mcveigh-branding.md
```

---

## Agent Roles

### Researcher (`agents/researcher.md`)
Sources external data (InfraBuild WB catalogue). Produces verified TypeScript array pasted into the card file. Does not write source files. Escalates immediately if `Iw` or `J` cannot be sourced with confidence — no estimation permitted.

**Pull condition:** Card type is `research` and card is READY.

**Quality contract:** All 14 WB rows, all 12 properties non-zero, source cited, TypeScript syntax valid and pasteable.

---

### Implementer (`agents/implementer.md`)
Writes source code changes for assigned card only. Creates the worktree branch (or works on main for C006), implements, self-verifies tsc + build, commits, moves card to CRITIC_REVIEW.

**Pull condition:** Card is READY, no card currently IN_PROGRESS for this agent.

**Must NOT:** Modify files outside "Files Owned". Use `any` or `@ts-ignore`. Remove code added by prior wave cards. Run `npm install`.

**Commit format:** `phase2(C00X): <present-tense description>`

---

### Critic (`agents/critic.md`)
Reviews implemented changes against spec. Issues APPROVED or CHANGES_REQUESTED with specific file+line defect descriptions. Never implements fixes. Works sequentially through the review checklist.

**Pull condition:** Card is CRITIC_REVIEW with a commit hash recorded.

**Review checklist (in order):**
1. Scope — only Files Owned modified
2. Non-clobber — shared files (types/index.ts, ResultsPanel.tsx, pdfExport.ts) not clobbered
3. Spec conformance — every spec sub-item addressed
4. TypeScript hygiene — no `any`, no suppression directives
5. Sign convention — C003/C004 BMD positive-y, deflection YAxis reversed
6. Regression check — prior wave content intact
7. Acceptance checklist — all items met

**Cycle limit:** Maximum 2 CHANGES_REQUESTED cycles. Cycle 2 failure → BLOCKED.

---

### Test Validator (`agents/test-validator.md`)
Runs `npx tsc --noEmit` and `npm run build` in the correct worktree (or main for C000/C006). Runs per-card structural acceptance checks. Records PASS/FAIL. Does not edit source.

**Pull condition:** Card is QA with APPROVED in STATUS block.

**On PASS:** Moves card to DONE.
**On FAIL:** Returns card to IN_PROGRESS with exact error output. After 2 failures → BLOCKED.

**Per-card checks are exhaustive** (defined in RULES.md §6 — covers exact class names, interface fields, function exports, import presence/absence for each card).

---

### Integrator (`agents/integrator.md`)
Manages git merges, enforces dependency gate registry, cleans up worktrees, escalates BLOCKED cards. Does not implement or review code quality.

**Acts when:** A wave's cards all reach DONE, or any card moves to BLOCKED.

**Merge order (critical):**
- Wave 1: C001 → C002 → C003 (into main). tsc + build after each.
- Wave 2: **C005 first** (SectionType union), then C004 (DiagramSet extension). Manual `types/index.ts` inspection after C004 merge to confirm both changes present.
- C006 runs directly on main — no merge needed.

**Dependency gate enforcement:** After each wave merges complete, moves newly eligible cards from BACKLOG to READY (C004 after Wave 1, C005 after C000 DONE, C006 after Wave 2).

**Worktree cleanup after each merge:**
```powershell
git worktree remove "..\steel-beam-tool-wt\<branch-slug>"
git branch -d "phase2/<branch-slug>"
```

---

## Execution Sequence

```
T=0   READY: C000, C001, C002, C003

T=1   Researcher → C000 (IN_PROGRESS)
      Implementer-A → C001 (worktree: c001-load-headers)
      Implementer-B → C002 (worktree: c002-auto-select)
      Implementer-C → C003 (worktree: c003-ref-lines)

T=2   All four → CRITIC_REVIEW

T=3   Critic reviews each → APPROVED → QA
      (Critic is sequential; CHANGES_REQUESTED loops back to implementer)

T=4   Test Validator runs all four → PASS → DONE
      C000 DONE → C005 moves BACKLOG→READY
      Wave 1 DONE signal sent to Integrator

T=5   Integrator: merge C001→C002→C003 into main (tsc+build after each)
      Wave 1 merges complete → C004 moves BACKLOG→READY

T=6   Implementer-A → C004 (worktree from post-Wave-1 main)
      Implementer-B → C005 (worktree from post-Wave-1 main)

T=7   C004, C005 → CRITIC_REVIEW → APPROVED → QA → PASS → DONE

T=8   Integrator: merge C005 first, manual types/index.ts check,
      then merge C004, manual types/index.ts check (verify both changes present)
      tsc+build after each. C006 moves BACKLOG→READY

T=9   Implementer → C006 on main (no worktree)

T=10  C006 → CRITIC_REVIEW → APPROVED → QA → PASS → DONE

T=11  Integrator: final verification, update KANBAN.md Merge Log,
      all 7 cards in DONE. Phase 2 complete.
```

---

## Dependency Gate Registry

| Card | Becomes READY when |
|---|---|
| C000 | Immediately |
| C001 | Immediately |
| C002 | Immediately |
| C003 | Immediately |
| C004 | C001 + C002 + C003 all DONE AND merged into main |
| C005 | C000 DONE |
| C006 | C001–C005 all DONE AND all merged into main |

---

## Critical Non-Clobber Rules

`types/index.ts` is touched by C004 and C005 in parallel:
- **C005** edits only `SectionType` union (line 1): adds `| 'WB'`
- **C004** adds `DeflectionProfilePoint` interface (after `DiagramPoint`) and extends `DiagramSet`
- Implementers are briefed on each other's changes in card files

`ResultsPanel.tsx` is touched by C003 (Wave 1), C004 (Wave 2), C006 (Wave 3) — each subsequent wave branches from main after prior merges, so C003's reference lines are present in C004's base, and both are present in C006's base.

`pdfExport.ts` is touched by C004 (full layout refactor) then C006 (header section only). C006 must not modify `drawDeflectionDiagram` or the diagram draw calls.

---

## Verification

After all cards reach DONE and all merges complete on main:
1. `npx tsc --noEmit` → 0 errors
2. `npm run build` → clean, no warnings
3. Dev server at `http://localhost:5173`:
   - Load tables show column headers when rows exist
   - Auto-select button shows inline status (green/red, no alert())
   - BMD/SFD charts show capacity reference lines (φMbx, φMs, φVv)
   - Third chart (deflection profile) visible with G+Q and G lines
   - WB appears in section type dropdown, produces valid results
   - McVeigh/Light theme switcher in header works, persists across refresh
4. PDF export: single A4 page, branded McVeigh header bar, 3 diagrams at ~40mm each

---

## Files to Create (Content Summary)

### `KANBAN.md`
Pre-populated board with all 7 cards. C000–C003 in READY column. C004, C005, C006 in BACKLOG with dependency annotations. Merge Log table (empty). Critic Cycle Tracker table (all zeros). Lessons Learnt section at the bottom — a retrospective log where any agent appends observations after a card reaches DONE (format: `| Card | Role | Observation |`). Covers surprises, near-misses, spec ambiguities resolved, and anything that would improve a future orchestration run. Not a column — cards do not flow through it.

### `RULES.md`
8 sections: Fundamental rules (7 rules), column transition conditions, worktree protocol (exact PowerShell commands), merge protocol (Wave 1 + Wave 2 sequences with manual checks), Critic review checklist, Test Validator per-card acceptance checks (exhaustive, covers exact JSX attributes/class names/TypeScript exports for each card), escalation rules, agent role summary table.

### `agents/researcher.md`
Pull conditions, read list, output format (TypeScript array in card file), quality contract, escalation rules (BLOCK on uncertain `Iw`/`J`), history log format.

### `agents/implementer.md`
Pull conditions, read order, must-NOT list, worktree setup commands, commit protocol, quality contract (self-verify tsc + build), escalation rules, history log format.

### `agents/critic.md`
Pull conditions, read list, APPROVED verdict format, CHANGES_REQUESTED verdict format with defect citation requirements, review checklist (7 items in order), quality contract (every finding must cite file + line + required fix), history log format.

### `agents/test-validator.md`
Pull conditions, PowerShell commands for worktree and main variants, per-card acceptance checks (full list matching RULES.md §6), PASS/FAIL recording format, must-NOT list, escalation rules (2 failures → BLOCKED).

### `agents/integrator.md`
When it acts (5 triggers), read list, exact merge commands (Wave 1 and Wave 2), dependency gate enforcement, worktree cleanup commands, BLOCKED escalation format (ESCALATION REQUIRED heading in KANBAN.md), KANBAN.md update protocol, quality contract (never merge without Critic+TV approval, always tsc+build after each individual merge, never force-push main).

### Cards (`cards/C000` through `cards/C006`)
Each card contains: type, branch, worktree path, blocked-by/blocks relationships, STATUS block (current column, assigned agent, critic verdict, critic cycle, TV result), objective, files owned, spec reference, implementation summary (code snippets from spec), acceptance checklist, history log (empty, ready to append).

C004 and C005 cards include explicit non-clobber briefings describing what the parallel card is adding to `types/index.ts`.

C006 card lists all prior wave content that must not be removed (column headers, auto-select feedback, reference lines, deflection chart).
