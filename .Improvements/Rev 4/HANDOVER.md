# Rev 4 Handover — Steel Beam Design Tool

**Date captured:** 2026-05-27
**Status:** Ready for planning agent — do not execute until orchestration plan is produced.

---

## Overview

8 items spanning three categories:
- **Engineering additions** (Items 1, 2): fixed support conditions; compressive beam-column loads
- **UI/output expansion** (Items 3, 4, 5): live calculation working in Results panel; job metadata; save/load file
- **Polish** (Items 6, 7, 8): McVeigh theme text contrast; dynamic deflection label; Grade 350 steel

No new npm packages required. All decisions below are final — confirmed with the engineer during a design interview on 2026-05-27.

---

## Item 1 — Fixed End Support Conditions

### What to build
Add a **Support Conditions** dropdown to the Geometry panel (below the Span field). Four options:

| Value | Label |
|---|---|
| `PP` | Pin–Pin (default, current behaviour) |
| `FP` | Fixed–Pin (End A fixed, End B pin) |
| `PF` | Pin–Fixed (End A pin, End B fixed) |
| `FF` | Fixed–Fixed |

End A = left support; End B = right support.

### Engineering change
The current `analyseBeam()` in `loadCombinations.ts` uses simply-supported beam mechanics (zero end moments). Fixed supports require fixed-end moment analysis. Implement via superposition of exact analytical fixed-end moment (FEM) results for each load type using standard structural mechanics tables (e.g. Roark's Table 8.1):

- **Point load** P at distance *a* from left end (b = L − a):
  - Fixed-Fixed: FEM_A = Pab²/L², FEM_B = Pa²b/L² (both hogging)
  - Pin-Fixed (B fixed): FEM_B = Pab(a + 2b) / (2L²)... use standard propped-cantilever tables
- **Full-span UDL** w:
  - Fixed-Fixed: FEM_A = FEM_B = wL²/12
  - Pin-Fixed (B fixed): FEM_B = wL²/8
- **Partial-span UDL**: use standard fixed-end moment tables for partial loading

Apply the FEMs to modify the BMD: for each cross-section x, M(x) = M_ss(x) − FEM_A·(1 − x/L) − FEM_B·(x/L), where M_ss is the simply-supported moment at x. Reactions follow from equilibrium after end moments are established.

The deflection calculation in `deflection.ts` also uses a simply-supported formulation — update it to use the correct boundary conditions for fixed ends (zero slope and zero deflection at fixed supports).

### Restraint interaction
When the support condition is changed:
- A **fixed** end (F or FF) → switch Restraints panel to **Advanced mode** and set the corresponding `endA` / `endB` to `'F'` (Fully restrained). Render that end-restraint select as **greyed out and disabled** with the note "Set by support condition."
- A **pin** end → no forced change to the corresponding restraint; it remains editable.
- On switching back to Pin–Pin: release all locks; previously auto-set values remain but become editable again.

### Type additions
```typescript
// src/types/index.ts
export type SupportCondition = 'PP' | 'FP' | 'PF' | 'FF';

// Add to DesignInputs:
supportCondition: SupportCondition;   // default: 'PP'
```

### Files affected
| File | Change |
|---|---|
| `src/types/index.ts` | Add `SupportCondition` type; add `supportCondition` to `DesignInputs` |
| `src/engineering/as1170/loadCombinations.ts` | Update `analyseBeam()` for fixed-end moment analysis |
| `src/engineering/as4100/deflection.ts` | Update deflection calculations for fixed-end boundary conditions |
| `src/components/GeometryPanel.tsx` | Add support condition dropdown |
| `src/components/RestraintPanel.tsx` | Add grey-out/lock logic for auto-set end restraints |
| `src/engineering/evaluate.ts` | Pass `supportCondition` through to beam analysis |
| `src/utils/pdfExport.ts` | State support condition in page 3 calc sheet |

### Default state
`supportCondition: 'PP'` — all existing behaviour unchanged.

---

## Item 2 — Compressive Axial Load (Beam-Column)

### What to build
Add a single axial compressive load input to the **Loads panel** — a new row at the bottom of the existing load tables:

```
Axial Compression (kN): [____]   Category: [G ▼]
```

Two new rows in the **Results table** (hidden when no compressive load is entered):
- `Combined (Section)` — N*/φNs + M*/φMs — demand / capacity / util / pass-fail
- `Combined (Member)` — N*/φNc + M*/φMbx — demand / capacity / util / pass-fail

Both rows feed into the overall PASS/FAIL.

### Engineering checks (AS4100 Section 8)
The axial compression is constant along the full member length.

**Factored N\*:** Compute per load combo (1.2G+1.5Q, G+Q, G); take the maximum.

**Section compression capacity (Cl. 6.2):**
```
φNs = 0.9 × Ag × fy
```

**Member compression capacity (Cl. 6.3):**
- Use Le from the Restraints panel (same value as LTB effective length)
- r_min = min(√(Ix/Ag), √(Iy/Ag)) in mm
- Form factor: kf = 1.0 for compact and noncompact sections; kf = Aeff/Ag for slender (Aeff uses effective plate widths)
- Modified slenderness: λn = (Le/r_min) × √(kf × fy / 250)
- Compression member factor αc from AS4100 Table 6.3.3(a) (residual stress category — use 'HR' for hot-rolled sections)
- φNc = 0.9 × αc × kf × Ag × fy

**Interaction checks:**
- Section: N*/φNs + M*/φMs ≤ 1.0 (Cl. 8.4.2.1)
- Member: N*/φNc + M*/φMbx ≤ 1.0 (Cl. 8.4.2.2)

Both checks appear in the web expanded calc section (Item 3) and PDF calc sheet (Item 3 scope extended).

### Type additions
```typescript
// src/types/index.ts

// Add to DesignInputs:
axialCompression: { magnitude: number; category: LoadCategory } | null;  // null = no compression

// Add to DesignIntermediates:
nStar: number;           // kN
phiNs: number;           // kN
phiNc: number;           // kN
kf: number;
lambdaN: number;
alphaC: number;
combinedSectionRatio: number;   // N*/φNs + M*/φMs
combinedMemberRatio: number;    // N*/φNc + M*/φMbx

// Add to CapacityResults passes:
combinedSection: boolean;
combinedMember: boolean;
```

### Files affected
| File | Change |
|---|---|
| `src/types/index.ts` | Add compression fields to `DesignInputs`, `DesignIntermediates`, `CapacityResults` |
| `src/engineering/as4100/compressionCapacity.ts` | **New file:** `calcCompressionCapacity(section, fy, Le_mm, sectionClass)` |
| `src/engineering/evaluate.ts` | Compute N*, call compressionCapacity, compute interaction ratios |
| `src/components/LoadPanel.tsx` | Add axial compression input row |
| `src/components/ResultsPanel.tsx` | Add two conditional result rows |
| `src/utils/pdfExport.ts` | Add combined action working to page 3 calc sheet (conditional on N* > 0) |

### Default state
`axialCompression: null` — rows hidden, no impact on existing checks.

---

## Item 3 — Expanded Calculation Working in Results Panel

### What to build
A **collapsible section** directly below the existing Results table, toggled by a "Show calculations ▾ / Hide calculations ▴" button. Covers all three check groups with assumption notes and formula-substitution steps. Uses proper Unicode symbols (φ, λ, α, ψ, ≤, ², √). All values read from `results.intermediates` — **no new engineering computation.**

### Bending section — "BENDING [util%]"
1. Assumption note: *"No holes specified in the flanges — full effective section modulus used (Cl. 5.2.6)."*
2. Section classification:
   - λ_f = (b_f − t_w) / (2 × t_f) × √(f_y / 250) = {value}; ε_p = 9; ε_y = 16 → {class}
   - λ_w = d_1 / t_w × √(f_y / 250) = {value}; ε_p = 82; ε_y = 115 → {class}
   - Section class: {compact / noncompact / slender}
3. Ze formula with substituted values → result mm³
4. φMsx = φ × f_y × Ze = 0.9 × {fy} × {Ze} / 10⁶ = **{phiMs} kN·m** [{util%}]
5. Restraint note: *"Any element providing full, partial, or lateral restraint must be designed to transfer 2.5% of the critical flange force (Cl. 5.4.3.1)."*
6. Assumption note: *"Segment assumed bent in single curvature, not subject to transverse loads — βm = −1.0 per Cl. 5.3.2.4(a). Conservative; can be refined using the αm override."*
7. L_max = r_y × (80 + 50βm) × √(250/f_y) = {ry} × (80 + 50 × −1.0) × √(250/{fy}) = **{Lmax} mm**
8. Segment length {Le_m×1000} mm {> / ≤} L_max {Lmax} mm → LTB check {required / not required per Cl. 5.3.2.4}.
9. *If LTB required:*
   - L_eb = k_t × k_l × k_r × L_s = {values} = **{Leb} mm**
   - M_oa = √[(π²EI_y/L_eb²)(GJ + π²EI_w/L_eb²)] = **{Moa/1e6:.2f} kN·m**
   - α_m = {alphaM} (from BMD shape per Cl. 5.6.1.1)
   - α_s = 0.6 × {√[(M_sx/M_oa)² + 3] − M_sx/M_oa} = **{alphaS:.3f}**
   - φM_bx = α_m × α_s × φM_sx ≤ φM_sx = {values} = **{phiMbx} kN·m** [{util%}]

### Shear section — "SHEAR [util%]"
1. A_w = d × t_w = {d} × {tw} = {Aw} mm²
2. d/t_w = {dOnTw:.1f}; slenderness limit = {slenderLimit:.1f} → web {slender / not slender}
3. φV_v = 0.9 × 0.6 × f_y × A_w {× reduction if slender} = **{phiVv:.1f} kN** [{util%}]

### Deflection section — "DEFLECTION"
1. Live load category: {liveLoadTypeLabel} → ψ_l = {psiL}
2. G+{psiL}Q combo: δ = {deflectionGpsiLQ:.1f} mm; limit = span/{deflectionLimitGpsiLQ:.0f} = {span×1000/deflectionLimitGpsiLQ:.1f} mm → {PASS / FAIL}
3. G combo: δ = {deflectionG:.1f} mm; limit = span/{deflectionLimitG:.0f} = {span×1000/deflectionLimitG:.1f} mm → {PASS / FAIL}

*If compression is active (Item 2):* append "COMBINED ACTIONS" section with section check and member check working.

### Files affected
| File | Change |
|---|---|
| `src/components/ResultsPanel.tsx` | Add collapsible working section with toggle button |

---

## Item 4 — Job Number and Job Name

### What to build
Two text input fields rendered **below the header bar, above the input panels**, full-width row:

```
Job No: [____________]    Job Name: [_________________________________]
```

**Stateless** — no localStorage. Resets to empty on page load.

### PDF changes
Two lines at the very top of page 1, before the existing inputs section:
```
Job No:    J001
Job Name:  Town Hall
```
Lines are omitted if the field is blank.

### Filename format (PDF)
```
[JobNo]_[JobName]_YYYYMMDD_HHMM.pdf
```
- Separator: underscore
- Date: `YYYYMMDD`, Time: `HHMM` (24-hour, local)
- Blank parts **omitted** (no double underscore)
- All parts stripped to filesystem-safe characters: `[A-Za-z0-9_-]` only

Examples:
- Both filled: `J001_TownHall_20260527_1430.pdf`
- No job number: `TownHall_20260527_1430.pdf`
- Both blank: `20260527_1430.pdf`

### Files affected
| File | Change |
|---|---|
| `src/App.tsx` | Add `jobNumber`/`jobName` state; render field row below header |
| `src/utils/pdfExport.ts` | Accept `jobNumber`/`jobName` in export args; add lines to page 1; update filename logic |
| `src/components/ResultsPanel.tsx` | Pass `jobNumber`/`jobName` into `exportToPDF` call |

---

## Item 5 — Save / Load JSON File

### What to build
**Import** and **Export** buttons on a single row, below the Job Number/Name fields, above the input panels:

```
[↑ Import]  [↓ Export]
```

### Export
File format: JSON. Extension: `.json`. Filename follows the same convention as PDF (Item 4):
```
[JobNo]_[JobName]_YYYYMMDD_HHMM.json
```

File structure:
```json
{
  "jobNumber": "J001",
  "jobName": "Town Hall",
  "inputs": { ...DesignInputs }
}
```

Trigger: standard browser download via `URL.createObjectURL(new Blob([json], { type: 'application/json' }))`.

### Import
Standard OS file picker: `<input type="file" accept=".json">`. On successful parse:
- Restore `jobNumber`, `jobName`, and all `DesignInputs` into app state
- Show inline success message: "Loaded: {filename}"

On parse failure: show inline error message: "Invalid file — could not load."

### Files affected
| File | Change |
|---|---|
| `src/App.tsx` | Add import/export handlers; render Import/Export button row; `jobNumber`/`jobName` state shared with Item 4 |

---

## Item 6 — Dark Text on Light Backgrounds (McVeigh Theme)

### Problem
`mc-panel` sets `color: var(--mc-cream)` which is inherited by `<input>` and `<textarea>` elements. Those elements have a browser-default white background, making cream text near-invisible.

### Fix
Add one rule to `src/index.css`:

```css
[data-theme="mcveigh"] input,
[data-theme="mcveigh"] textarea,
[data-theme="mcveigh"] select option {
  color: #111;
  background-color: #ffffff;
}
```

### Files affected
| File | Change |
|---|---|
| `src/index.css` | Add one CSS rule |

---

## Item 7 — Dynamic Deflection Label

### Problem
The label "G+Q deflection limit: span /" is hardcoded. It should reflect the actual ψ_l factor from the selected live load type.

### Fix
Replace the hardcoded string with a dynamic expression using `results.intermediates.psiL` (already computed):

```
G+{psiL}Q deflection limit: span /
```

Examples:
- Office (ψ_l = 0.4) → `G+0.4Q deflection limit: span /`
- Storage (ψ_l = 0.6) → `G+0.6Q deflection limit: span /`
- Roof (ψ_l = 0) → `G+0Q deflection limit: span /`

### Files affected
| File | Change |
|---|---|
| `src/components/ResultsPanel.tsx` | Replace hardcoded label string |

---

## Item 8 — Steel Grade Selection (Grade 300 / Grade 350)

### What to build
Dropdown in the **Geometry panel**, below the Section type select. Applies to all section types.

```
Steel Grade: [Grade 300 ▼]
             [Grade 300   ]
             [Grade 350   ]
```

### fy values
| Grade | tf ≤ 11 mm | 11 < tf ≤ 17 mm | tf > 17 mm |
|---|---|---|---|
| Grade 300 (existing) | 300 MPa | 300 MPa | 280 MPa |
| Grade 350 (new, AS3678) | 360 MPa | 340 MPa | 330 MPa |

Update `calcFy(section, grade)` in `sectionUtils.ts` to accept a `SteelGrade` parameter. All callers pass `inputs.steelGrade`.

### Type additions
```typescript
// src/types/index.ts
export type SteelGrade = 'G300' | 'G350';

// Add to DesignInputs:
steelGrade: SteelGrade;   // default: 'G300'
```

### Files affected
| File | Change |
|---|---|
| `src/types/index.ts` | Add `SteelGrade` type; add `steelGrade` to `DesignInputs` |
| `src/engineering/sections/sectionUtils.ts` | Update `calcFy` signature and Grade 350 logic |
| `src/engineering/evaluate.ts` | Pass `inputs.steelGrade` to `calcFy` |
| `src/engineering/sections/autoSelect.ts` | Pass `inputs.steelGrade` to `calcFy` |
| `src/components/GeometryPanel.tsx` | Add grade dropdown |

---

## Implementation Sequencing (suggested cards)

Dependencies:
- Item 5 (import/export) depends on Item 4 (job fields) — build together
- Item 3 (expanded calc UI) depends on Items 1, 2, 8 being finalised so `DesignIntermediates` is complete
- Items 6, 7 are independent and trivial — build first

| Card | Items | Rationale |
|---|---|---|
| **4R0** | 6, 7 | Trivial CSS + label fix; zero risk; immediate visible proof |
| **4R1** | 8 | Types + sectionUtils only; clean engineering addition |
| **4R2** | 4, 5 | Job metadata + save/load; pure UI state, no engineering |
| **4R3** | 1 | Fixed supports; significant change to loadCombinations + deflection |
| **4R4** | 2 | Compression; new compressionCapacity.ts; depends on types from 4R3 being stable |
| **4R5** | 3 | Expanded calc UI; pure rendering; must come last so all intermediates exist |

All cards execute sequentially on `main` (no worktrees). File conflicts:
- `types/index.ts` touched by 1, 2, 8 — but each card's changes are in different interface fields
- `evaluate.ts` touched by 1, 2, 8 — sequential order avoids conflicts
- `pdfExport.ts` touched by 1, 2, 4 — sequential order avoids conflicts

---

## Verification Gates (each card)

Standard gates (all cards):
- `npx tsc --noEmit` — 0 errors
- `npm run build` — clean
- Playwright MCP browser visual confirmation

Card-specific:

| Card | Verification |
|---|---|
| 4R0 | McVeigh theme: input text visible; deflection label updates with live load type change |
| 4R1 | Grade 350 increases fy/φMs/φMbx vs Grade 300 for same section; autoSelect respects grade |
| 4R2 | Job fields visible; PDF filename includes job metadata; round-trip import/export restores all state exactly |
| 4R3 | Fixed-Fixed UDL: BMD shows hogging moments at both ends, sagging at midspan; Pin-Pin: unchanged behaviour; restraint locked to F at fixed ends |
| 4R4 | With N* > 0: combined action rows appear; with N* = 0: rows hidden; overstressed combined case shows FAIL |
| 4R5 | Collapsible toggle works; substituted values match results table; assumption notes present; compression section visible when N* > 0 |
