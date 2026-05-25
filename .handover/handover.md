# Steel Beam Design Tool — Handover

## Project Overview

A web-based structural engineering design tool for Australian Grade 300 steel beam design, built as a client-side React/TypeScript application. The tool guides an engineer through geometry, loading, and restraint inputs, then delivers live AS4100-compliant design results with bending moment and shear force diagrams.

---

## Scope — v1

**Member type:** Beam only (columns, braces deferred to future versions).

---

## Technology Stack

| Item | Decision |
|------|----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Deployment | Local only (`npm run dev`) |
| PDF export | jsPDF (or react-pdf) |
| Charting (BMD/SFD) | Recharts or Chart.js |
| Styling | Tailwind CSS (or CSS modules) |

No backend. All calculations run entirely in the browser.

---

## Application Layout

**Side-by-side split layout:**

```
┌─────────────────────────┬──────────────────────────┐
│   LEFT — Inputs         │   RIGHT — Results        │
│                         │                          │
│  1. Geometry Panel      │  Live-updating on any    │
│  2. Load Panel          │  input change            │
│  3. Restraint Panel     │                          │
└─────────────────────────┴──────────────────────────┘
```

Results panel recalculates live whenever any input changes.

---

## Panel 1 — Geometry

| Field | Detail |
|-------|--------|
| Span | metres (metric) |
| Tributary width | metres (metric) |
| Section type | Dropdown: UB / UC / PFC / EA / SHS / CHS / RHS |
| Section size | Dropdown: filtered by type, full InfraBuild catalogue |
| Auto-select button | Finds lightest passing section across selected section type |

**Section database:** Full InfraBuild standard section tables, hardcoded as JSON, Grade 300 steel (fy = 300 MPa, fu = 440 MPa). Covers all standard sizes for UB, UC, PFC, EA, SHS, CHS, RHS.

---

## Panel 2 — Loads

Multiple loads of each type, all in metric units (kN, kN/m, kPa).

| Load type | Inputs |
|-----------|--------|
| Point load | Magnitude (kN), position from left support (m), load category (G or Q) |
| Line load (UDL) | Magnitude (kN/m), start position (m), end position (m), load category (G or Q) |
| Area load | Magnitude (kPa), start position (m), end position (m), load category (G or Q) — converted to line load via tributary width |

- Engineer can add/remove any number of each load type.
- Self-weight (G) is calculated automatically from the selected section and added to dead load transparently.

**Load combinations (AS1170.1):**

| Combination | Use |
|-------------|-----|
| 1.2G + 1.5Q | Strength design |
| G + Q | Serviceability deflection check |
| G only | Dead load deflection check |

---

## Panel 3 — Restraints

Two modes, engineer selects:

### Simple Mode (default)
Predefined restraint cases with associated effective length factors:
- Both ends fully restrained (FF)
- Pin-pin (PP)
- Pin-fixed (PF)
- Cantilever (FC)
- Unrestrained top flange (custom le multiplier)

### Advanced Mode
- Restraint category at each end: **F** (fully restrained), **P** (partially restrained), **L** (laterally restrained), **U** (unrestrained)
- Intermediate restraint locations: engineer nominates positions along span (metres from left support)
- Effective length calculated per AS4100 Section 5

---

## Panel 4 — Results

Live-updating. Each check shows: **demand**, **capacity**, **utilisation ratio (%)**, **PASS / FAIL**.

### Design Checks

| Check | Standard | Notes |
|-------|----------|-------|
| Section moment capacity | AS4100 Cl. 5.1 | φMs = φ × Ze × fy |
| Member moment capacity | AS4100 Cl. 5.6 | φMbx (accounts for lateral-torsional buckling) |
| Shear capacity | AS4100 Cl. 5.11 | φVv at critical section |
| Deflection — G+Q | AS4100 / Steel Design Handbook | Default limit: span/300 (user-overridable) |
| Deflection — G only | AS4100 / Steel Design Handbook | Default limit: span/360 (user-overridable) |

**Overall result:** PASS if all checks pass. FAIL with failing checks highlighted in red.

### Diagrams
- Bending Moment Diagram (BMD) — factored (1.2G+1.5Q) and unfactored (G+Q)
- Shear Force Diagram (SFD) — factored and unfactored
- Diagrams rendered inline in the results panel

### Deflection Limit Overrides
User-editable fields for each deflection limit (default values pre-filled):
- G+Q limit: `span / [300]`
- G only limit: `span / [360]`

### PDF Export
"Export PDF" button generates a single-page A4 report containing:
- Project inputs (geometry, loads, restraints, section)
- All check results with utilisation ratios
- BMD and SFD diagrams
- PASS / FAIL summary

---

## AS Standards References

| Standard | Application |
|----------|-------------|
| AS1170.1:2002 | Load combinations (G, Q definitions, combination factors) |
| AS4100:2020 | Steel member design (bending, shear, effective length, LTB) |
| AISC Steel Design Handbook (9th ed.) | Deflection limits, design guidance |

---

## Key Engineering Notes

1. **Grade 300 assumed throughout** — fy = 300 MPa for flanges ≤ 17mm, fy = 320 MPa for flanges > 17mm (AS4100 Table 2.1 — implement correctly per section).
2. **Compact section check** — Ze must account for whether section is compact, non-compact, or slender (AS4100 Cl. 5.2).
3. **αm and αs factors** — moment modification factor (αm) and slenderness reduction factor (αs) required for member moment capacity per AS4100 Cl. 5.6.
4. **Self-weight** — retrieved from section database (kg/m), converted to kN/m, automatically included as dead load (G).
5. **Deflection calculation** — use elastic beam theory; superimpose contributions from each load. For accurate results under multiple loads, use the principle of superposition with standard beam deflection formulae or numerical integration.
6. **Area loads** — converted to equivalent line loads (kN/m) by multiplying area load (kPa) × tributary width (m) before any structural calculation.

---

## Suggested Project Structure

```
src/
├── components/
│   ├── GeometryPanel.tsx
│   ├── LoadPanel.tsx
│   ├── RestraintPanel.tsx
│   └── ResultsPanel.tsx
├── engineering/
│   ├── as4100/
│   │   ├── momentCapacity.ts       # φMs, φMbx
│   │   ├── shearCapacity.ts        # φVv
│   │   ├── effectiveLength.ts      # le from restraint inputs
│   │   └── deflection.ts           # elastic deflection calculations
│   ├── as1170/
│   │   └── loadCombinations.ts     # G, Q combination assembly
│   └── sections/
│       ├── sectionDatabase.ts      # InfraBuild catalogue JSON
│       └── autoSelect.ts           # lightest passing section logic
├── types/
│   └── index.ts                    # shared TypeScript types
├── utils/
│   └── pdfExport.ts                # jsPDF report generation
└── App.tsx
```

---

## Out of Scope — v1

- Column design (axial compression, buckling)
- Brace design (tension/compression)
- Wind, earthquake, snow loads
- Web bearing and buckling checks
- Connection design
- Multi-span beams
- User authentication or project saving
- Remote/cloud deployment
