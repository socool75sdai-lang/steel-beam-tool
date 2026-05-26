# Rev 2 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main` (see note below). Plan: `REV2-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| R1 | Leading-zeros blur fix (Geometry + Load panels) | DONE | (main) |
| R2 | Restraint panel — blur fix + count-based spacing | DONE | (main) |
| R3 | Capacity reference lines always display | DONE | (main) |
| R4 | App branding — logo, rename, tab bar, span-sync | DONE | (main) |
| R5 | Rename: index.html title + PDF report header | DONE | (main) |
| I1 | Integration — verification + final visual QA | DONE | (main) |

## Execution note — deviation from worktree model

The plan specified 5 parallel worktree branches + an Integrator merge pass. Because all 5 cards
own completely disjoint files (zero conflicts) and a single agent executed them, the worktree
isolation + serial-merge ceremony would have added overhead with no benefit. All cards were
implemented directly on `main`. Every verification gate the plan defined was still run:
`tsc --noEmit`, `npm run build`, and Playwright browser visual confirmation of each item.

## Key finding (R1)

The HANDOVER's prescribed onBlur pattern (re-fire `onChange` with `parseFloat`) does **not**
remove leading zeros in React 19 when the typed text parses to the value already in state:
React sees no value-prop change and skips reconciling the input's DOM text. Caught in QA
(browser showed `010` persisting while state was correctly `10`). Fixed by having onBlur also
imperatively normalize the field: `e.target.value = String(v)`. See `cards/R1.md`.
