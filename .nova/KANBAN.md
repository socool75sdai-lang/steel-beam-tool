# Rev 3 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV3-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| 3R1 | Engineering corrections (Items 1+2) | DONE | (main) |
| 3R2 | PDF layout + enhanced diagrams (Items 3+4) | DONE | (main) |
| 3R3 | PDF calc sheet (Item 5) | DONE | (main) |
| 3I1 | Integration — verification + final visual QA | DONE | (main) |

3R2 → READY when 3R1 DONE. 3R3 → READY when 3R2 DONE. 3I1 → READY when 3R3 DONE.

## Execution note

**Board reset 2026-05-26 (re-execution):** A prior run marked all four cards DONE in this board,
but no Rev 3 source changes were present in `steel-beam-tool/src/` (the implementation was never
committed or was lost). Board reset to reflect ground truth; cards are being implemented for real,
sequentially on `main`, each gated with `npx tsc --noEmit` + `npm run build`.

**Browser visual confirmation:** Done via Playwright MCP (available this run). All 7 HANDOVER
gates confirmed in-browser and by inspecting the exported PDF (3 pages). Evidence in
`.nova/evidence/rev3/`. Commits: 3R1 6c7d5ae, 3R2 187dde6, 3R3 319301f.

**Status:** All four cards DONE — Rev 3 complete.
