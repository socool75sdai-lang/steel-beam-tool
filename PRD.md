# Product Requirements Document — Steel Beam Design Tool

**Version:** 1.0
**Date:** 2026-05-22
**Status:** Approved for build

---

## 1. Product Overview

### 1.1 Purpose
A browser-based structural engineering design tool that lets a practising structural engineer rapidly design simply-supported steel beams to Australian Standards. The tool computes design capacities, performs serviceability checks, and produces a single-page PDF report — all client-side, with no network calls.

### 1.2 Target Users
Practising structural engineers and graduate engineers performing routine beam design for residential, light commercial, and industrial floor/roof framing.

### 1.3 Scope (v1)
- **In scope:** simply-supported single-span beams; UB, UC, PFC, EA, SHS, CHS, RHS; Grade 300 steel; gravity loads (G + Q); strength (bending + shear) and serviceability (deflection) checks; live recalculation; PDF export.
- **Out of scope:** columns, braces, multi-span/continuous beams, wind/snow/earthquake actions, web bearing/buckling, connections, user accounts, cloud sync.

### 1.4 Success Criteria
- A user can enter inputs and receive a fully checked, AS4100-compliant beam design in under 60 seconds.
- Auto-select returns the lightest passing section across the chosen section type in < 1 second.
- PDF report contains all inputs, all check results, and BMD/SFD diagrams on a single A4 page.

---

## 2. Standards Compliance

| Standard | Application |
|----------|-------------|
| **AS1170.1:2002** | Load combinations (G, Q definitions, combination factors) |
| **AS4100:2020** (with reference to AS4100:1998) | Steel member design (bending, shear, effective length, LTB) |
| **AISC Steel Design Handbook (9th ed.)** | Deflection limits, design guidance |
| **InfraBuild Standard Section Tables** | Section catalogue and dimensional/geometric properties |

All Australian Grade 300 steel:
- `fy = 300 MPa` for `tf ≤ 17 mm`
- `fy = 280 MPa` for `tf > 17 mm`
- `fu = 440 MPa` throughout

---

## 3. Functional Requirements

### 3.1 Application Layout
Side-by-side split:
- **Left (40%):** Geometry panel, Load panel, Restraint panel — scrollable
- **Right (60%):** Results panel — live-updating on every input change

### 3.2 Panel 1 — Geometry
| Field | Type | Units | Validation |
|-------|------|-------|------------|
| Span | numeric | m | > 0 |
| Tributary width | numeric | m | > 0 |
| Section type | dropdown | — | UB / UC / PFC / EA / SHS / CHS / RHS |
| Section size | dropdown | — | filtered by type, full InfraBuild catalogue |
| Auto-select | button | — | finds lightest passing section in selected type |

### 3.3 Panel 2 — Loads
Multiple loads of each type, all metric:

| Load type | Inputs |
|-----------|--------|
| Point load | magnitude (kN), position from left support (m), category G/Q |
| Line load (UDL) | magnitude (kN/m), start (m), end (m), category G/Q |
| Area load | magnitude (kPa), start (m), end (m), category G/Q |

- Add/remove any number of each load type.
- Area loads converted to line loads via `w = kPa × tributary_width` before any structural calculation.
- Self-weight calculated automatically from selected section (`mass_kg_m × 9.81 / 1000` kN/m) and added transparently as G UDL.

**Load combinations (AS1170.1):**

| Combination | Use |
|-------------|-----|
| 1.2G + 1.5Q | Strength design |
| G + Q | Serviceability deflection (live + dead) |
| G | Dead-load deflection check |

### 3.4 Panel 3 — Restraints

**Simple mode (default):**
| Case | `Le` multiplier |
|------|-----------------|
| FF — both ends fully restrained | 1.0 |
| PP — pin-pin | 1.0 |
| PF — pin-fixed | 1.2 |
| FC — cantilever | 0.7 |
| Custom — user `Le/L` multiplier | user value |

**Advanced mode:**
- End A restraint category: F (full) / P (partial) / L (lateral) / U (unrestrained)
- End B restraint category: F / P / L / U
- Intermediate restraints: list of positions (m from left support)
- Effective length computed per AS4100 Section 5

**αm override:** checkbox to manually override the calculated moment modification factor.

### 3.5 Panel 4 — Results

Each design check displays: **demand**, **capacity**, **utilisation (%)**, **PASS / FAIL** indicator.

| Check | Standard | Formula / Notes |
|-------|----------|-----------------|
| Section moment capacity | AS4100 Cl. 5.1 | `φMs = 0.9 × Ze × fy` |
| Member moment capacity | AS4100 Cl. 5.6 | `φMbx = 0.9 × αm × αs × Msx` capped at `φMs` |
| Shear capacity | AS4100 Cl. 5.11 | `φVv = 0.9 × 0.6 × fy × Aw` (stocky web) |
| Deflection — G+Q | AS4100 / SDH | Default limit: span/300 (user-overridable) |
| Deflection — G | AS4100 / SDH | Default limit: span/360 (user-overridable) |

**Overall result:** PASS if all checks pass; FAIL with failing checks highlighted red.

**Diagrams:**
- BMD (Bending Moment Diagram) — factored (1.2G+1.5Q) and unfactored (G+Q)
- SFD (Shear Force Diagram) — factored and unfactored
- Rendered inline using Recharts

**Deflection limit overrides:** user-editable `span / [denominator]` for each combo.

---

## 4. Engineering Calculation Spec

### 4.1 Section Classification (AS4100 Cl. 5.2)
Element slenderness: `λe = (b/t)·√(fy/250)`.

| Element | λep (plastic) | λey (yield) |
|---------|---------------|-------------|
| I-section flange outstand | 9 | 16 |
| I-section web (bending) | 82 | 115 |

Section class = most critical element class (compact / non-compact / slender).

### 4.2 Effective Section Modulus `Ze` (Cl. 5.2.3)
- **Compact:** `Ze = min(Sx, 1.5·Zx)`
- **Non-compact:** linear interpolation between `Zx` and `Sx` based on `(λey - λe)/(λey - λep)`
- **Slender:** `Ze = Zx·(λey/λe)²`

### 4.3 Member Moment Capacity (Cl. 5.6)
- `Msx = Ze × fy`
- Reference buckling moment: `Moa = √[(π²EIy/Le²)·(GJ + π²EIw/Le²)]` with `E = 200 GPa`, `G = 80 GPa`
- Slenderness reduction: `αs = 0.6·{√[(Msx/Moa)² + 3] − (Msx/Moa)}`
- Moment modification: `αm = min(2.5, 1.7·Mmax / √(M2² + M3² + M4²))` (M2/M4 quarter-point, M3 midspan), default 1.0 if Mmax = 0
- `φMbx = min(0.9·αm·αs·Msx, 0.9·Msx)`

### 4.4 Shear Capacity (Cl. 5.11)
- Web area: `Aw = d × tw`
- Web slenderness threshold: `(d/tw) ≤ 82·√(250/fy)`
- Stocky web: `Vv = 0.6·fy·Aw`
- Slender web: apply buckling reduction per Cl. 5.11.5
- `φVv = 0.9 × Vv`

### 4.5 Deflection
Elastic superposition with `EI` in N·mm². Convert loads to N and span to mm for consistency.

| Load | Mid-span deflection |
|------|---------------------|
| Full-span UDL `w` | `5wL⁴ / (384·EI)` |
| Partial UDL `w` over `[a,b]` | Macaulay integration |
| Point load `P` at `a` (a ≤ L/2) | `Pa(3L² − 4a²) / (48·EI)` |

Check: `δ_GQ ≤ L / limit_GQ` and `δ_G ≤ L / limit_G`.

### 4.6 Load Combinations
| Combo | factor G | factor Q |
|-------|----------|----------|
| Strength | 1.2 | 1.5 |
| Serviceability | 1.0 | 1.0 |
| Dead | 1.0 | 0.0 |

Self-weight is added as a G UDL: `w_sw = (mass_kg_m × 9.81) / 1000` kN/m.

---

## 5. Data Model

### 5.1 `SteelSection`
```ts
interface SteelSection {
  designation: string;      // e.g. "200UB25.4"
  type: SectionType;        // 'UB' | 'UC' | 'PFC' | 'EA' | 'SHS' | 'CHS' | 'RHS'
  mass_kg_m: number;        // kg/m
  d: number;                // overall depth (mm)
  bf: number;               // flange width (mm) — for hollow/angle, set sensibly
  tf: number;               // flange thickness (mm)
  tw: number;               // web thickness (mm)
  Ag: number;               // gross area (mm²)
  Ix: number;               // major axis 2nd moment (mm⁴)
  Sx: number;               // plastic section modulus (mm³)
  Zx: number;               // elastic section modulus (mm³)
  Iy: number;               // minor axis 2nd moment (mm⁴)
  J:  number;               // torsion constant (mm⁴)
  Iw: number;               // warping constant (mm⁶)
}
```

### 5.2 Loads
```ts
interface PointLoad { id: string; magnitude: number; position: number; category: 'G'|'Q'; }
interface LineLoad  { id: string; magnitude: number; start: number; end: number; category: 'G'|'Q'; }
interface AreaLoad  { id: string; magnitude: number; start: number; end: number; category: 'G'|'Q'; }
```

### 5.3 `RestraintConfig`
```ts
interface RestraintConfig {
  mode: 'simple' | 'advanced';
  simpleType?: 'FF' | 'PP' | 'PF' | 'FC' | 'custom';
  leMultiplier?: number;                // when simpleType = 'custom'
  endA?: 'F' | 'P' | 'L' | 'U';
  endB?: 'F' | 'P' | 'L' | 'U';
  intermediate?: number[];              // positions in m
  alphaMOverride?: number | null;
}
```

### 5.4 `DesignInputs`
```ts
interface DesignInputs {
  span: number;                  // m
  tributaryWidth: number;        // m
  section: SteelSection;
  loads: { point: PointLoad[]; line: LineLoad[]; area: AreaLoad[]; };
  restraint: RestraintConfig;
  deflLimits: { GQ: number; G: number; };
}
```

### 5.5 `CapacityResults`
```ts
interface CapacityResults {
  // demands
  Mmax: number;            // factored design moment, kN·m
  Vmax: number;            // factored design shear, kN
  // section
  sectionClass: 'compact' | 'noncompact' | 'slender';
  Ze: number;              // mm³
  // capacities
  phiMs: number;           // kN·m
  phiMbx: number;          // kN·m
  phiVv: number;           // kN
  // member capacity intermediate
  Le: number;              // mm
  alphaM: number;
  alphaS: number;
  // deflection
  deflectionGQ: number;    // mm
  deflectionG: number;     // mm
  deflectionLimitGQ: number;// mm
  deflectionLimitG: number; // mm
  // pass/fail
  passes: {
    sectionMoment: boolean;
    memberMoment: boolean;
    shear: boolean;
    deflectionGQ: boolean;
    deflectionG: boolean;
    overall: boolean;
  };
}
```

### 5.6 `DiagramPoint`
```ts
interface DiagramPoint { x: number; moment: number; shear: number; }
```

---

## 6. UI / UX Spec

- **Layout:** flex split, left 40% / right 60%, both scrollable.
- **Live update:** every input change triggers `useMemo` re-computation in `useDesignCalculations`. Target latency < 100 ms.
- **Validation:** numeric inputs validated on blur; inline error messages.
- **Pass/fail visual:** green ✓ for pass, red ✗ for fail per row; overall banner at top of results panel.
- **Empty / invalid state:** until a valid section + span > 0 + ≥ 1 load is provided, results show "Enter inputs to see results".
- **No persistence:** all state is in-memory only.

---

## 7. PDF Report Spec

Single-page A4 portrait, generated via jsPDF + html2canvas for chart capture.

**Sections (top → bottom):**
1. Header: title, date, designation, span, PASS / FAIL banner
2. Inputs summary: geometry, restraints, load list table
3. Section properties: designation, mass, key dimensions, Ix, Sx, Zx, Iy, J, Iw
4. Capacity check table: row per check with demand / capacity / utilisation / status (red highlight if util > 1.0)
5. BMD diagram (factored)
6. SFD diagram (factored)

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Recalculation latency | < 100 ms on input change |
| Bundle size (gzipped) | < 500 KB |
| Network calls | 0 (fully offline) |
| Browsers | Modern evergreen (Chrome, Edge, Firefox, Safari) latest 2 versions |
| Accessibility | Keyboard navigable, semantic HTML labels |

---

## 9. Acceptance Tests

### 9.1 Worked Example 1 — Section moment capacity
- 6 m span, 200UB25.4, 20 kN point load at midspan, G only, fully restrained (FF)
- Expected: `Mmax ≈ 30 kN·m`, `φMs ≈ 70 kN·m` (Ze·fy·0.9, Ze ≈ 259×10³ mm³, fy = 300 MPa)
- Utilisation ≈ 0.43, PASS

### 9.2 Worked Example 2 — LTB sensitivity
- Same beam, but unrestrained (U-U), no intermediate restraints
- Expected: `αs < 1.0`, `φMbx < φMs`, may FAIL

### 9.3 Worked Example 3 — Deflection
- 6 m span, 200UB25.4, 10 kN/m G UDL
- `Ix ≈ 23.6 × 10⁶ mm⁴`
- `δ = 5·10·6000⁴/(384·200000·23.6×10⁶) ≈ 35.7 mm` against `L/300 = 20 mm` → FAIL deflection
- Confirms deflection often governs serviceability beam design.

### 9.4 Auto-select
- 6 m span, 10 kN/m Q UDL + 5 kN/m G UDL, FF restraint, UB type
- Expected: tool returns lightest UB section that passes all checks (often a 250UB or 310UB).

### 9.5 PDF export
- Click "Export PDF" with any valid design → A4 PDF opens with all 4 capacity rows and both diagrams visible.

---

## 10. Build & Deployment

- `npm run dev` — Vite dev server on `http://localhost:5173`
- `npm run build` — production bundle in `dist/`
- `npm run preview` — preview production build locally
- No deployment required; user runs locally.
