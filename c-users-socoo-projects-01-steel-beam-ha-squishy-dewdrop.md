# Steel Beam Design Tool — Build Plan

## Context

A structural engineering web app for Australian Grade 300 steel beam design per AS4100 and AS1170.1. The project directory contains only a handover spec and prompts file — no code exists yet. The build will produce a React 18 + TypeScript + Vite client-side app with live design checks, BMD/SFD diagrams, and PDF export.

Execution order: PRD → Scaffold → Types/Database → Engineering Calcs → UI Panels → Integration.

---

## Step 1 — Write PRD

Write `C:\Users\socoo\.projects\01 Steel Beam\PRD.md` with sections:
1. Product Overview (purpose, target users, scope)
2. Standards Compliance (AS4100-1998, AS1170.1-2002, InfraBuild catalogue)
3. Functional Requirements (by panel: Geometry, Loads, Restraints, Results)
4. Engineering Calculation Spec (formulae, clause refs, acceptance criteria)
5. Data Model (SteelSection, load types, restraint config, result shape)
6. UI/UX Spec (split layout, live-update strategy, validation)
7. PDF Report Spec (layout, required fields, diagram inclusion)
8. Non-Functional Requirements (sub-100ms recalc, no network, browser compat)
9. Acceptance Tests (worked examples with known answers)

---

## Step 2 — Write Agent Profiles

Save all agent profiles to `C:\Users\socoo\.projects\01 Steel Beam\.orchestration\`.

### Agents

| File | Agent Name | Wave | Depends On |
|------|-----------|------|-----------|
| `agent-scaffold.md` | project-scaffold | 0 | — |
| `agent-types.md` | type-definitions | 1 | Wave 0 |
| `agent-sections-db.md` | section-database | 1 | Wave 0 |
| `agent-load-combos.md` | load-combinations | 2 | Wave 1 |
| `agent-moment-capacity.md` | section-capacity | 2 | Wave 1 |
| `agent-shear-deflection.md` | shear-deflection | 2 | Wave 1 |
| `agent-effective-length.md` | effective-length | 2 | Wave 1 |
| `agent-auto-select.md` | auto-select | 3 | Wave 2 |
| `agent-pdf-export.md` | pdf-export | 3 | Wave 1 |
| `agent-geometry-panel.md` | geometry-panel | 4 | Wave 3 |
| `agent-load-panel.md` | load-panel | 4 | Wave 1 |
| `agent-restraint-panel.md` | restraint-panel | 4 | Wave 1 |
| `agent-results-panel.md` | results-panel | 4 | Wave 2 |
| `agent-integration.md` | app-integration | 5 | Wave 4 |

---

## Step 3 — Scaffold Project

**npm commands (run in project root):**
```
npm create vite@latest steel-beam-tool -- --template react-ts
cd steel-beam-tool
npm install tailwindcss @tailwindcss/vite recharts jspdf html2canvas
```

**project-scaffold agent produces:**
- `vite.config.ts` — includes `@tailwindcss/vite` plugin, `@/` alias → `src/`
- `tsconfig.json` — path aliases matching vite config
- `src/main.tsx`, `src/App.tsx` (stub), `src/index.css`
- Empty directories: `src/components/`, `src/engineering/as4100/`, `src/engineering/as1170/`, `src/engineering/sections/`, `src/types/`, `src/utils/`, `src/hooks/`

---

## Step 4 — Wave 1 (Parallel): Types + Section Database

### type-definitions agent → `src/types/index.ts`

Key interfaces:
- `SteelSection` — `d, bf, tf, tw, Ix, Sx, Zx, Iy, J, Iw, mass_kg_m, type, designation`
- `PointLoad`, `LineLoad`, `AreaLoad` — magnitude, position/range, `category: 'G'|'Q'`
- `RestraintConfig` — `mode: 'simple'|'advanced'`, `simpleType: 'FF'|'PP'|'PF'|'FC'|'custom'`, `leMultiplier`, end restraints, intermediate restraints
- `DesignInputs` — composite of all panel inputs
- `CapacityResults` — `phiMs, phiMbx, phiVv, deflectionGQ, deflectionG, alphaM, alphaS, sectionClass, Ze, Mmax, Vmax`
- `DiagramPoint` — `x: number, moment: number, shear: number`
- `ValidationError` — `field, message, severity`

### section-database agent → `src/engineering/sections/sectionDatabase.ts` + `sectionUtils.ts`

Full InfraBuild catalogue as `Record<SectionType, SteelSection[]>` sorted ascending by mass.

**Mandatory section properties for LTB:** `Ix, Iy, J, Iw, Sx, Zx` (plastic), `d, bf, tf, tw`.

**fy rule:** `tf <= 17mm` → fy = 300 MPa; `tf > 17mm` → fy = 280 MPa (AS4100 Table 2.1 Grade 300).

Sections to include:
- **UB:** 150UB14.0 → 610UB125 (~25 sizes)
- **UC:** 100UC14.8 → 310UC158 (~14 sizes)
- **PFC:** 75PFC → 380PFC (~10 sizes)
- **EA:** 50×50×3 → 200×200×16 (~12 sizes)
- **SHS:** 50×50×3 → 250×250×9 (~10 sizes)
- **RHS:** 75×50×3 → 300×200×10 (~10 sizes)
- **CHS:** 48.3×3.2 → 323.9×9.5 (~10 sizes)

Exports: `getSectionsByType(type)`, `getSectionByDesignation(name)`, `getDefaultSection()`.

---

## Step 5 — Wave 2 (Parallel): Engineering Calculations

### load-combinations agent → `src/engineering/as1170/loadCombinations.ts`

- Three combos: `{1.2G+1.5Q}`, `{G+Q}`, `{G}`
- Area loads → line loads: `w = kPa × tributaryWidth`
- Self-weight added as G UDL: `w_sw = mass_kg_m × 9.81 / 1000` kN/m
- `calcBMD(loads, span, combo)` — 200-point elastic superposition
- `calcReactions(loads, span, combo)` — simple supported beam
- Returns `{ bmd, sfd, Mmax, Vmax, reactions }`

### section-capacity agent → `src/engineering/as4100/momentCapacity.ts`

**Section classification (Cl. 5.2)** via element slenderness `λe = (b/t)√(fy/250)`:
- Flange: `λep=9`, `λey=16`; Web: `λep=82`, `λey=115`
- Class = most critical element

**Effective modulus Ze (Cl. 5.2.3):**
- Compact: `Ze = min(Sx, 1.5·Zx)`
- Non-compact: linear interpolation
- Slender: `Ze = Zx·(λey/λe)²`

**Section capacity:** `φMs = 0.9 × Ze × fy`

**Member capacity with LTB (Cl. 5.6):**
- `Msx = Ze × fy`
- `Moa = (π²EIy/Le²)·√(GJ + π²EIw/Le²)` where E=200000 MPa, G=80000 MPa
- `αs = 0.6·{√[(Msx/Moa)²+3] − (Msx/Moa)}`
- `φMbx = min(φ·αm·αs·Msx, φMsx)` where φ=0.9

### shear-deflection agent → `src/engineering/as4100/shearCapacity.ts` + `deflection.ts`

**Shear (Cl. 5.11):**
- Web slenderness `dp/tw ≤ 82√(250/fy)`: `Vv = 0.6·fy·(dp×tw)`, else buckling reduction
- `φVv = 0.9 × Vv`

**Deflection** — elastic superposition per load:
- Full UDL: `δ = 5wL⁴/(384EI)`
- Partial UDL: Macaulay method or piecewise integration
- Point load at `a ≤ L/2`: `δmax = Pa(3L²-4a²)/(48EI)`
- Check `δ_GQ ≤ L/deflLimitGQ`, `δ_G ≤ L/deflLimitG`

### effective-length agent → `src/engineering/as4100/effectiveLength.ts`

Simple mode `Le` multipliers:
- FF: 1.0, PP: 1.0, PF: 1.2, FC: 0.7, custom: `leMultiplier`

Advanced mode: AS4100 Table 5.6.3 (F/P/L/U at each end).

**αm (Cl. 5.6.1.1):**
- `αm = 1.7·Mmax / √(M2²+M3²+M4²)` where M2/M4=quarter-point, M3=midspan
- Clamp to `[1.0, 2.5]`
- For intermediate restraints: per-segment αm, use critical segment

---

## Step 6 — Wave 3 (Parallel): Auto-Select + PDF

### auto-select agent → `src/engineering/sections/autoSelect.ts`

- Iterate sections of selected type ascending by mass
- Run full capacity check (moment, shear, deflection) for each
- Return first passing section + results
- Export: `autoSelectSection(inputs, type): { section, results } | null`

### pdf-export agent → `src/utils/pdfExport.ts`

- Use `jsPDF` directly (no autotable)
- A4 report: project inputs summary, section properties table, capacity check table (demand/capacity/utilisation/pass-fail), deflection checks, BMD+SFD as images via canvas serialisation
- Utilisation > 1.0 highlighted red
- Export: `exportToPDF(inputs, results, bmd, sfd): void`

---

## Step 7 — Wave 4 (Parallel): React Components

### geometry-panel agent → `src/components/GeometryPanel.tsx`
- Span, tributary width inputs
- Section type `<select>` → filters section size `<select>` via `getSectionsByType`
- Auto-select button → calls `autoSelectSection` → fires `onSectionChange`
- Controlled via `(inputs, onChange)` props
- Validate span > 0, tributaryWidth > 0 on blur

### load-panel agent → `src/components/LoadPanel.tsx`
- Three sub-sections: Point Loads / Line Loads / Area Loads
- Add/remove rows; each row: magnitude, position/range, G/Q toggle
- Read-only self-weight row computed from section mass
- Position validated against span on blur

### restraint-panel agent → `src/components/RestraintPanel.tsx`
- Mode toggle: Simple | Advanced
- Simple: radio group FF/PP/PF/FC + custom multiplier
- Advanced: end A/B restraint category (F/P/L/U), intermediate restraints table
- αm override checkbox + manual input
- Pure controlled component

### results-panel agent → `src/components/ResultsPanel.tsx`
- Capacity summary table: φMs, φMbx, φVv, deflection — demand/capacity/utilisation/status
- Green ✓ pass / Red ✗ fail per row
- Two Recharts `<LineChart>` stacked: BMD (factored + unfactored), SFD (factored + unfactored)
- `<ReferenceLine y={0}` on each chart
- Deflection limit override inputs (span/[300], span/[360])
- PDF export button → calls `exportToPDF`

---

## Step 8 — Wave 5 (Sequential): Integration

### app-integration agent → `src/App.tsx` + `src/hooks/useDesignCalculations.ts`

**State shape in App.tsx:**
```ts
inputs: DesignInputs       // all panel inputs combined
deflLimits: { GQ: 300, G: 360 }
```

**`useDesignCalculations` hook (useMemo on inputs):**
1. `calcBMD` for all 3 combos
2. `calcEffectiveLength` + `calcAlphaMom` (uses factored BMD)
3. `calcSectionCapacity` + `calcMemberCapacity`
4. `calcShearCapacity`
5. `calcDeflection` for G+Q and G combos
6. Return `{ results, bmd, sfd, isValid }`

**Layout:**
```tsx
<div className="flex h-screen overflow-hidden">
  <div className="w-2/5 overflow-y-auto p-4 border-r">
    <GeometryPanel /> <LoadPanel /> <RestraintPanel />
  </div>
  <div className="w-3/5 overflow-y-auto p-4">
    <ResultsPanel />
  </div>
</div>
```

ErrorBoundary wraps ResultsPanel to prevent calculation errors from crashing the app.

---

## Verification

1. `npx tsc --noEmit` — zero type errors before running
2. **Worked example:** 6m span, 200UB25.4, 20 kN point load midspan (G only) — expect `Mmax ≈ 30 kN·m`, `φMs ≈ 72 kN·m`, utilisation ≈ 0.42
3. **LTB sanity:** unrestrained 6m beam → `αs < 1.0`; fully restrained → `φMbx = φMsx`
4. **Deflection:** 6m span, 200UB25.4, 10 kN/m UDL → `δ ≈ 6.3 mm` vs limit 20 mm (pass)
5. `npm run build` — Vite bundle completes without errors
6. `npm run dev` — change span input, confirm results panel updates live
7. PDF export — opens A4 with all 4 capacity rows and both diagrams

---

## Critical Files

- `src/types/index.ts` — shared interfaces; everything depends on this
- `src/engineering/sections/sectionDatabase.ts` — InfraBuild catalogue with correct `Ix, Iw, J`; wrong values break LTB
- `src/engineering/as4100/momentCapacity.ts` — core AS4100 Cl. 5.6 LTB logic; highest complexity
- `src/engineering/as1170/loadCombinations.ts` — BMD/SFD engine; feeds results panel and αm
- `src/hooks/useDesignCalculations.ts` — computation ordering; bugs here break all live results

---

## Notification

Only notify user when `npm run build` completes successfully and the dev server launches cleanly.
