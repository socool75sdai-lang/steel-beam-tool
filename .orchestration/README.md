# Subagent Orchestration — Steel Beam Design Tool

This directory contains agent profiles for the orchestrated build of the Steel Beam Design Tool. Each profile documents the responsibility, dependencies, inputs, outputs, and key implementation details for a discrete unit of work.

## Wave Architecture

```
Wave 0: project-scaffold
   │
Wave 1: type-definitions ─── section-database          (parallel)
   │
Wave 2: load-combinations, section-capacity,
        shear-deflection, effective-length             (parallel)
   │
Wave 3: auto-select, pdf-export                        (parallel)
   │
Wave 4: geometry-panel, load-panel,
        restraint-panel, results-panel                 (parallel)
   │
Wave 5: app-integration                                (sequential)
```

## Agent Roster

| File | Wave | Files Produced |
|------|------|----------------|
| `agent-scaffold.md` | 0 | `vite.config.ts`, `tsconfig.json`, `index.css`, dir structure |
| `agent-types.md` | 1 | `src/types/index.ts` |
| `agent-sections-db.md` | 1 | `src/engineering/sections/sectionDatabase.ts`, `sectionUtils.ts` |
| `agent-load-combos.md` | 2 | `src/engineering/as1170/loadCombinations.ts` |
| `agent-moment-capacity.md` | 2 | `src/engineering/as4100/momentCapacity.ts` |
| `agent-shear-deflection.md` | 2 | `src/engineering/as4100/shearCapacity.ts`, `deflection.ts` |
| `agent-effective-length.md` | 2 | `src/engineering/as4100/effectiveLength.ts` |
| `agent-auto-select.md` | 3 | `src/engineering/sections/autoSelect.ts` |
| `agent-pdf-export.md` | 3 | `src/utils/pdfExport.ts` |
| `agent-geometry-panel.md` | 4 | `src/components/GeometryPanel.tsx` |
| `agent-load-panel.md` | 4 | `src/components/LoadPanel.tsx` |
| `agent-restraint-panel.md` | 4 | `src/components/RestraintPanel.tsx` |
| `agent-results-panel.md` | 4 | `src/components/ResultsPanel.tsx` |
| `agent-integration.md` | 5 | `src/App.tsx`, `src/hooks/useDesignCalculations.ts` |

## Orchestration Principles

- **Wave parallelism:** all agents within a wave run concurrently; the orchestrator waits for the wave to complete before launching the next wave.
- **Strict contracts:** types defined in Wave 1 are the integration contract for all downstream waves.
- **Self-contained briefs:** each agent receives the full PRD-derived context it needs without depending on conversational state.
- **Idempotency:** every agent's output is deterministic given its inputs — re-running an agent should produce the same file contents.

## Engineering Reference Documents

- `PRD.md` (project root) — Product Requirements Document
- `.handover/handover.md` — original engineering handover spec
- AS4100:2020, AS1170.1:2002, AISC Steel Design Handbook 9th ed., InfraBuild section tables
