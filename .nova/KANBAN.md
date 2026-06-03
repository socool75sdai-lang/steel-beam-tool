# Rev 5 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV5-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch | Commit |
|------|-------|--------|--------|--------|
| 5R0 | CSS text fix + PDF BMD flip (Items 1+3) | DONE | (main) | a5493a0 |
| 5R1 | Tab navigation + ColumnApp stub (Item 2) | DONE | (main) | f1baa7c |
| 5R2 | Column types + engineering (Item 4a) | DONE | (main) | 9ee0572 |
| 5R3 | Column components + hook (Item 4b) | DONE | (main) | d06a7a3 |
| 5R4 | Column PDF export (Item 4c) | DONE | (main) | b4008e0 |
| 5I1 | Integration — verification + final visual QA | DONE | (main) | — |

All cards DONE (2026-06-03). tsc 0 errors, build clean, all browser/PDF QA gates green.
Evidence: `.nova/evidence/rev5/`.
