# Steel Beam Design Tool — Project Journal

---

## 2026-05-25 — Initial Build & Audit

### Context
Project: Browser-based structural engineering tool for Australian Grade 300 steel beam design per AS4100-1998 and AS1170.1-2002. Stack: React 18 + TypeScript + Vite, client-side only, no network calls.

### Work completed prior to this session
When this session began, the project directory already contained a handover spec, a completed PRD, all agent profile `.md` files in `.orchestration/`, and a fully scaffolded `steel-beam-tool/` Vite project with all source files written. The build had been executed by a prior agent wave.

### Audit performed this session
Reviewed all critical source files:

| File | Status |
|---|---|
| `src/types/index.ts` | All interfaces present: SteelSection, PointLoad, LineLoad, AreaLoad, RestraintConfig, DesignInputs, CapacityResults, DiagramSet, ValidationError |
| `src/engineering/sections/sectionDatabase.ts` | Full InfraBuild catalogue: UB (27 sizes), UC (13), PFC (10), EA (12), SHS, RHS, CHS |
| `src/engineering/sections/sectionUtils.ts` | getSectionsByType, getDefaultSection, calcFy (tf≤17→300MPa), calcSelfWeightKnPerM |
| `src/engineering/sections/autoSelect.ts` | Iterates ascending by mass, short-circuits on first passing section |
| `src/engineering/as1170/loadCombinations.ts` | 3 combos (1.2G+1.5Q, G+Q, G), 201-point elastic BMD/SFD by superposition |
| `src/engineering/as4100/momentCapacity.ts` | AS4100 Cl. 5.2 section classification, Ze, φMs; Cl. 5.6 LTB (Moa, αs, φMbx) |
| `src/engineering/as4100/shearCapacity.ts` | AS4100 Cl. 5.11, web slenderness reduction |
| `src/engineering/as4100/deflection.ts` | Elastic superposition via strip integration; G+Q and G combos |
| `src/engineering/as4100/effectiveLength.ts` | Simple (FF/PP/PF/FC/custom) and advanced (Table 5.6.3) Le; αm per Cl. 5.6.1.1 |
| `src/engineering/evaluate.ts` | Orchestrates all checks, returns CapacityResults + DiagramSet |
| `src/hooks/useDesignCalculations.ts` | useMemo wrapper around evaluateDesign |
| `src/App.tsx` | Split layout (2/5 inputs, 3/5 results), ErrorBoundary around ResultsPanel |
| `src/components/GeometryPanel.tsx` | Span, tributary width, section type/size selects, auto-select button |
| `src/components/LoadPanel.tsx` | Point/line/area load tables with G/Q toggle; read-only self-weight row |
| `src/components/RestraintPanel.tsx` | Simple/Advanced mode toggle; αm override checkbox |
| `src/components/ResultsPanel.tsx` | Capacity table (demand/capacity/util/pass-fail); Recharts BMD+SFD; PDF export button |
| `src/utils/pdfExport.ts` | jsPDF A4 report with capacity table and diagrams |
| `vite.config.ts` | @tailwindcss/vite plugin, `@/` alias → `src/` |

### Verification results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | Pass — 791 modules, 1.19 MB bundle |
| `npm run dev` | Starts cleanly at http://localhost:5173 |

### Engineering spot-check: 6m span, 200UB25.4, 20 kN midspan (G only)
- fy = 300 MPa (tf = 7.8 mm ≤ 17 mm) ✓
- Section: compact (λ_f = 8.93 ≤ 9, λ_w = 35.4 ≤ 82) ✓
- Ze = min(Sx, 1.5·Zx) = min(260e3, 348e3) = 260,000 mm³
- φMs = 0.9 × 260,000 × 300 / 1e6 = **70.2 kN·m**
- Mmax (1.2G factored, with self-weight) = **37.35 kN·m**
- Section moment utilisation = **53.2%** → PASS

### Note on build plan's verification examples
The build plan spec contained two inaccurate expected values:
1. "Mmax ≈ 30 kN·m, util ≈ 0.42" — these figures used the unfactored G-only load. The code correctly applies the 1.2G factored combo per AS4100, giving 37.35 kN·m and 53% utilisation.
2. "δ ≈ 6.3 mm for 10 kN/m UDL" — the correct elastic deflection for a 200UB25.4 over 6 m with 10 kN/m is ~36.6 mm. The spec figure is wrong by a factor of ~5.8. The code formula (5wL⁴/384EI) is correct.

### Dev server
Started as a background process; accessible at http://localhost:5173 during the session.

---

*Journal entries will be added here as work progresses.*
