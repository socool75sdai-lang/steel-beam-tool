# Rev 6 Kanban Board — Steel Beam Design Tool

Pull model: BACKLOG → READY → IN_PROGRESS → CRITIC_REVIEW → QA → DONE (or BLOCKED).
Execution mode: single-track sequential on `main`. Plan: `.nova/REV6-ORCHESTRATION-PLAN.md`.
Roles: Implementer → Critic (spec review) → Validator (browser-MCP visual confirmation).

| Card | Title | Column | Branch | Commit |
|------|-------|--------|--------|--------|
| 6R0 | Grey->cream helper text (McVeigh, all tabs) — Item 4 | DONE | (main) | a6f4d3d |
| 6R1 | Beam top/bottom flange restraints + governing-segment LTB — Item 1 | DONE | (main) | 288f35b |
| 6R2 | Column "Show calculations" collapsible — Item 3 | DONE | (main) | 6d5ae7f |
| 6R3 | Brace types + engine + psi_c — Item 2 | DONE | (main) | 4110e94 |
| 6R4 | Brace UI + hook + tab + graphs + collapsible — Item 2/3 | DONE | (main) | 813c7cd |
| 6R5 | Brace PDF (3-page ASCII) — Item 2 | READY | (main) | — |
| 6I1 | Integration QA — all four items, browser + PDF evidence | BACKLOG | (main) | — |

6R1 -> READY when 6R0 DONE; 6R2 when 6R1 DONE; 6R3 when 6R2 DONE; 6R4 when 6R3 DONE;
6R5 when 6R4 DONE; 6I1 when 6R5 DONE.
