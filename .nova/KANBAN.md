# Rev 4 Kanban Board — Steel Beam Design Tool

Pull model: `BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE` (or `BLOCKED`).
Execution mode: single-agent direct execution on `main`. Plan: `.nova/REV4-ORCHESTRATION-PLAN.md`.

| Card | Title | Column | Branch |
|------|-------|--------|--------|
| 4R0 | Polish — theme text + dynamic label (Items 6+7) | DONE (561eca1) | (main) |
| 4R1 | Steel grade dropdown (Item 8) | DONE (b2330b2) | (main) |
| 4R2 | Job metadata + save/load JSON (Items 4+5) | DONE (b2858fa) | (main) |
| 4R3 | Fixed end support conditions (Item 1) | DONE (0a033ce) | (main) |
| 4R4 | Axial compression + combined actions (Item 2) | DONE (6fc90cb) | (main) |
| 4R5 | Expanded calculation working (Item 3) | DONE (3a89c60) | (main) |
| 4I1 | Integration — verification + final visual QA | DONE | (main) |

4R1 → READY when 4R0 DONE. 4R2 → READY when 4R1 DONE. 4R3 → READY when 4R2 DONE.
4R4 → READY when 4R3 DONE. 4R5 → READY when 4R4 DONE. 4I1 → READY when 4R5 DONE.

## Status

**All cards DONE — Rev 4 complete.** Commits: 4R0 561eca1, 4R1 b2330b2, 4R2 b2858fa,
4R3 0a033ce, 4R4 6fc90cb, 4R5 3a89c60. Each card gated with `npx tsc --noEmit` +
`npm run build` + Playwright MCP browser confirmation. Evidence in `.nova/evidence/rev4/`.

**Note (4R4):** the plan's approximate `calcAlphaC` was replaced with the exact AS4100
Cl. 6.3.3 (HR) curve — the plan's closed form returned αc ≈ 0.85 at λn ≈ 175 versus the
cited Table 6.3.3(a) value ≈ 0.22, so it was corrected to honour the spec's stated source.
