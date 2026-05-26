# Steel Beam Design Tool — Phase 2 Enhancement Spec

**For:** Orchestration Designer Agent  
**Date:** 2026-05-25  
**Status:** Ready for orchestration  

---

## 1. Context

The tool is a fully built, passing client-side React 18 + TypeScript + Vite app at:

```
C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool\
```

`npx tsc --noEmit` → 0 errors. `npm run build` → clean. Dev server runs at `http://localhost:5173`.

This spec describes **6 enhancements** to be executed by **7 agents** across **3 sequential waves**. All work is inside `steel-beam-tool/src/` unless otherwise stated.

---

## 2. Wave Structure & Dependencies

```
[PRE] Agent 0 — WB Research          (must complete before Wave 2)
        │
        ├── Wave 1 (parallel — no shared files)
        │     ├── Agent 1 — Load Panel Column Headers
        │     ├── Agent 2 — Auto-Select Feedback
        │     └── Agent 3 — Capacity Reference Lines
        │
        ├── Wave 2 (parallel — Agent 0 output required)
        │     ├── Agent 4 — Deflection Chart + PDF Layout
        │     └── Agent 5 — WB Section Build   ← consumes Agent 0 output
        │
        └── Wave 3 (sequential — all Wave 2 files must be merged first)
              └── Agent 6 — McVeigh Branding + PDF Header
```

**File conflict map:**

| File | Agents touching it |
|---|---|
| `types/index.ts` | Agent 4, Agent 5 (non-overlapping sections) |
| `pdfExport.ts` | Agent 4 (layout), Agent 6 (header — second touch) |
| `sectionDatabase.ts` | Agent 5 only |
| `ResultsPanel.tsx` | Agent 3 (reference lines), Agent 4 (deflection chart), Agent 6 (theme classes) |
| All component files | Agent 6 only |

Wave 2 agents both touch `types/index.ts`. The orchestration designer must ensure Agent 4 adds to `DiagramSet` and Agent 5 adds to the `SectionType` union — these are non-overlapping and can be merged automatically, but agents must be briefed on what the other agent is adding so they don't clobber each other's change.

---

## 3. Baseline Acceptance Criteria (all agents)

Every agent must verify before declaring done:

1. `npx tsc --noEmit` → 0 errors
2. `npm run build` → clean build, no warnings on changed files
3. Plus the per-agent criteria listed in each spec below

---

## 4. Agent Specs

---

### Agent 0 — WB Research (Pre-task, no code)

**Objective:** Source verified section property data for all 14 InfraBuild Welded Beam (WB) designations from the publicly available InfraBuild WB catalogue and produce a ready-to-paste TypeScript array.

**Output format:** A TypeScript array literal matching the exact shape of existing entries in `sectionDatabase.ts`. Example shape (do not use these values):

```typescript
const WB: SteelSection[] = [
  { designation: '700WB115', type: 'WB', mass_kg_m: 115, d: 700, bf: 250, tf: 12, tw: 6,
    Ag: 14600, Ix: 2340e6, Sx: 7320e3, Zx: 6700e3, Iy: 78.5e6, J: 798e3, Iw: 22400e9 },
  // ... all 14 entries
];
```

**Required sections (all 14):**

| Designation | mass (kg/m) | d (mm) | bf (mm) | tf (mm) | tw (mm) |
|---|---|---|---|---|---|
| 700WB115 | 115 | 700 | 250 | 12 | 6 |
| 700WB128 | 128 | 700 | 250 | 14 | 6.5 |
| 700WB150 | 150 | 700 | 250 | 16 | 8 |
| 700WB173 | 173 | 700 | 250 | 20 | 8 |
| 800WB122 | 122 | 800 | 250 | 12 | 6 |
| 800WB146 | 146 | 800 | 250 | 14 | 7 |
| 800WB168 | 168 | 800 | 250 | 16 | 8 |
| 800WB192 | 192 | 800 | 250 | 20 | 8 |
| 900WB175 | 175 | 900 | 250 | 16 | 8 |
| 900WB218 | 218 | 900 | 300 | 20 | 9 |
| 900WB257 | 257 | 900 | 300 | 25 | 10 |
| 1000WB215 | 215 | 1000 | 300 | 16 | 9 |
| 1000WB258 | 258 | 1000 | 300 | 20 | 10 |
| 1000WB322 | 322 | 1000 | 300 | 25 | 12 |

**Properties to source for each section:** `Ag` (mm²), `Ix` (mm⁴), `Sx` (mm³), `Zx` (mm³), `Iy` (mm⁴), `J` (mm⁴), `Iw` (mm⁶)

**Source:** InfraBuild Welded Beam section tables (publicly available PDF catalogue). `Iw` and `J` are critical for LTB accuracy — do not estimate or interpolate.

**Acceptance:** All 14 rows present with all 12 properties populated with real catalogue values. Output the complete TypeScript array literal in the agent response — Agent 5 will copy it verbatim.

---

### Agent 1 — Load Panel Column Headers

**Objective:** Add persistent column header rows to the Point Loads, Line Loads, and Area Loads tables in `LoadPanel.tsx` so field labels remain visible after values are entered.

**File:** `src/components/LoadPanel.tsx`

**Current state:** Each row has `placeholder` text (`"kN"`, `"start (m)"` etc.) which disappears once the user types. There are no column headers.

**Implementation:**

For each load section, render a header row **only when `inputs.loads.[type].length > 0`** (no empty-state header). Place the header row immediately before the `.map(...)` that renders load rows.

**Point Loads header** — matches the 12-column grid used for load rows:
```tsx
{inputs.loads.point.length > 0 && (
  <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
    <span className="col-span-3">Magnitude (kN)</span>
    <span className="col-span-3">Position (m)</span>
    <span className="col-span-4">Category</span>
    <span className="col-span-2" />
  </div>
)}
```

**Line Loads header** — matches the 12-column grid used for line load rows:
```tsx
{inputs.loads.line.length > 0 && (
  <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
    <span className="col-span-2">Mag. (kN/m)</span>
    <span className="col-span-2">Start (m)</span>
    <span className="col-span-2">End (m)</span>
    <span className="col-span-4">Category</span>
    <span className="col-span-2" />
  </div>
)}
```

**Area Loads header** — same grid shape as Line Loads, unit label differs:
```tsx
{inputs.loads.area.length > 0 && (
  <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
    <span className="col-span-2">Mag. (kPa)</span>
    <span className="col-span-2">Start (m)</span>
    <span className="col-span-2">End (m)</span>
    <span className="col-span-4">Category</span>
    <span className="col-span-2" />
  </div>
)}
```

Do **not** remove the existing `placeholder` attributes — they remain as secondary aids.

**Acceptance:**
- tsc + build pass
- Header row visible when ≥1 row of that type exists
- Header row absent when the load list is empty
- Placeholder text still present on inputs

---

### Agent 2 — Auto-Select Feedback

**Objective:** Add an inline status line below the "Auto-select lightest" button in `GeometryPanel.tsx` showing the outcome for all three possible results.

**File:** `src/components/GeometryPanel.tsx`

**Current state:** `handleAutoSelect` calls `autoSelectSection`, calls `onChange` on success silently, and calls `alert()` on null. The alert should be replaced; all outcomes should show in the UI.

**Implementation:**

1. Add state:
```tsx
const [autoSelectMsg, setAutoSelectMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
```
Add `import React from 'react';` at top if not already present (check — `useRef` etc. may already import it).

2. Replace `handleAutoSelect` entirely:
```tsx
const handleAutoSelect = () => {
  const result = autoSelectSection(inputs, inputs.section.type);
  if (!result) {
    setAutoSelectMsg({ text: `No passing section found in ${inputs.section.type} — try reducing loads or changing section type.`, ok: false });
    return;
  }
  if (result.section.designation === inputs.section.designation) {
    setAutoSelectMsg({ text: `${inputs.section.designation} is already the lightest passing ${inputs.section.type}.`, ok: true });
    return;
  }
  onChange({ section: result.section });
  setAutoSelectMsg({ text: `Selected ${result.section.designation} — lightest passing ${inputs.section.type}.`, ok: true });
};
```

3. Render the status line immediately after the button:
```tsx
{autoSelectMsg && (
  <p className={`mt-2 text-xs ${autoSelectMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
    {autoSelectMsg.text}
  </p>
)}
```

4. Clear the message when section type changes — add `setAutoSelectMsg(null)` inside `handleTypeChange`.

**Acceptance:**
- tsc + build pass
- Outcome "found different section": green text, section dropdown updates
- Outcome "already optimal": green text, no section change
- Outcome "no passing section": red text, no section change
- Message clears when section type dropdown changes

---

### Agent 3 — Capacity Reference Lines on BMD / SFD

**Objective:** Add horizontal reference lines to the BMD and SFD charts in `ResultsPanel.tsx` showing current design capacities, coloured green (passing) or red (failing).

**File:** `src/components/ResultsPanel.tsx`

**Current state:** `ReferenceLine` is already imported from recharts. It is only used for `y={0}`. No capacity lines exist.

**BMD chart — add two lines inside the `<LineChart>` for the BMD, after the existing `<ReferenceLine y={0} ...>`:**

```tsx
<ReferenceLine
  y={results.phiMbx}
  stroke={results.passes.memberMoment ? '#16a34a' : '#dc2626'}
  strokeWidth={1.5}
  label={{ value: 'φMbx', position: 'insideTopRight', fontSize: 10 }}
/>
<ReferenceLine
  y={results.phiMs}
  stroke={results.passes.sectionMoment ? '#16a34a' : '#dc2626'}
  strokeDasharray="4 2"
  strokeWidth={1}
  label={{ value: 'φMs', position: 'insideBottomRight', fontSize: 10 }}
/>
```

**Important — sign convention:** The BMD `YAxis` uses `reversed`. Moment demand values (`factoredM`, `servicM`) are stored as positive numbers for sagging moments. The capacity reference lines must also be positive (`y={results.phiMbx}`, not negative) so they appear at the correct position on the reversed axis alongside the demand curve.

**SFD chart — add two lines inside the `<LineChart>` for the SFD, after the existing `<ReferenceLine y={0} ...>`:**

```tsx
<ReferenceLine
  y={results.phiVv}
  stroke={results.passes.shear ? '#16a34a' : '#dc2626'}
  strokeWidth={1.5}
  label={{ value: 'φVv', position: 'insideTopRight', fontSize: 10 }}
/>
<ReferenceLine
  y={-results.phiVv}
  stroke={results.passes.shear ? '#16a34a' : '#dc2626'}
  strokeWidth={1.5}
  label={{ value: '-φVv', position: 'insideBottomRight', fontSize: 10 }}
/>
```

**Acceptance:**
- tsc + build pass
- BMD shows two horizontal lines: φMbx (solid) and φMs (dashed)
- SFD shows two symmetric horizontal lines: +φVv and -φVv
- Lines are green when the corresponding check passes, red when it fails
- Lines update when section or loads change (they are derived from `results` props — this is automatic)

---

### Agent 4 — Deflection Chart + PDF Layout

**Objective:** Add a deflection profile chart as a third diagram below the SFD, expose deflection profile data through the engineering layer, and update `pdfExport.ts` to explicitly lay out all three charts on a single A4 page at ~40mm each.

**Files touched:**
- `src/engineering/as4100/deflection.ts`
- `src/engineering/evaluate.ts`
- `src/types/index.ts`
- `src/components/ResultsPanel.tsx`
- `src/utils/pdfExport.ts`

---

#### 4a — `src/types/index.ts`

Add a new interface and extend `DiagramSet`. Insert after the existing `DiagramPoint` interface:

```typescript
export interface DeflectionProfilePoint {
  x: number;    // m from left support
  delta: number; // mm, positive = downward
}
```

Extend `DiagramSet`:
```typescript
export interface DiagramSet {
  factored: DiagramPoint[];
  serviceability: DiagramPoint[];
  dead: DiagramPoint[];
  deflectionGQ: DeflectionProfilePoint[];  // add
  deflectionG: DeflectionProfilePoint[];   // add
}
```

---

#### 4b — `src/engineering/as4100/deflection.ts`

Add a new exported function `calcDeflectionProfile` after the existing `calcDeflection` function. The internal logic (load assembly, EI, strip integration) is **identical** to `calcDeflection` — extract the shared load-assembly code into a private helper or duplicate it. Do not modify `calcDeflection`.

```typescript
export function calcDeflectionProfile(
  inputs: DesignInputs,
  combo: 'G+Q' | 'G',
): DeflectionProfilePoint[] {
  const E = 200_000;
  const EI = E * inputs.section.Ix;
  const L = inputs.span * 1000;

  const gFactor = 1.0;
  const qFactor = combo === 'G+Q' ? 1.0 : 0.0;

  // Assemble pointLoads and lineLoads arrays exactly as in calcDeflection
  // (same unit conversions, same self-weight UDL inclusion)
  // ...

  const samples = 81;
  const profile: DeflectionProfilePoint[] = [];
  for (let i = 0; i < samples; i++) {
    const x = (L * i) / (samples - 1);
    let delta = 0;
    for (const p of pointLoads) delta += deflectionPointLoad(p.P, p.a, L, EI, x);
    for (const w of lineLoads) delta += deflectionPartialUDL(w.w, w.a, w.b, L, EI, x);
    profile.push({ x: x / 1000, delta });
  }
  return profile;
}
```

The import for `DeflectionProfilePoint` comes from `'@/types'` — add it to the existing import.

---

#### 4c — `src/engineering/evaluate.ts`

Import `calcDeflectionProfile`:
```typescript
import { calcDeflection, calcDeflectionProfile } from '@/engineering/as4100/deflection';
```

Call both profiles and include in `DiagramSet`:
```typescript
const deflectionGQProfile = calcDeflectionProfile(inputs, 'G+Q');
const deflectionGProfile  = calcDeflectionProfile(inputs, 'G');

const diagrams: DiagramSet = {
  factored: factored.bmd,
  serviceability: servic.bmd,
  dead: dead.bmd,
  deflectionGQ: deflectionGQProfile,
  deflectionG: deflectionGProfile,
};
```

---

#### 4d — `src/components/ResultsPanel.tsx`

**Chart refs:** The single `chartContainerRef` currently wraps both charts. Split into three separate refs — one per chart — for use by the updated PDF export:

```tsx
const bmdRef = useRef<HTMLDivElement>(null);
const sfdRef = useRef<HTMLDivElement>(null);
const deflRef = useRef<HTMLDivElement>(null);
```

Remove the existing `chartContainerRef`. Update the `handleExport` call to pass the three refs (see §4e for new `PdfExportArgs`).

**Chart data:** Extend `chartData` to include deflection (or build a separate array — separate is cleaner):
```tsx
const deflData = diagrams.deflectionGQ.map((pt, i) => ({
  x: pt.x,
  deltaGQ: pt.delta,
  deltaG: diagrams.deflectionG[i]?.delta ?? 0,
}));
```

**Third chart — add inside the charts container div, after the SFD chart:**
```tsx
<div ref={deflRef}>
  <h3 className="text-sm font-semibold mb-1">Deflection Profile (mm)</h3>
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={deflData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="x" label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }} />
      <YAxis
        reversed
        label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip />
      <Legend />
      <ReferenceLine y={0} stroke="#000" />
      <ReferenceLine
        y={results.deflectionLimitGQ}
        stroke={results.passes.deflectionGQ ? '#16a34a' : '#dc2626'}
        strokeDasharray="4 2"
        label={{ value: `L/${inputs.deflLimits.GQ}`, position: 'insideTopRight', fontSize: 10 }}
      />
      <ReferenceLine
        y={results.deflectionLimitG}
        stroke={results.passes.deflectionG ? '#16a34a' : '#dc2626'}
        strokeDasharray="2 4"
        label={{ value: `L/${inputs.deflLimits.G}`, position: 'insideBottomRight', fontSize: 10 }}
      />
      <Line type="monotone" dataKey="deltaGQ" stroke="#2563eb" name="G+Q" dot={false} />
      <Line type="monotone" dataKey="deltaG"  stroke="#9ca3af" name="G" strokeDasharray="4 2" dot={false} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

**Y-axis `reversed`:** Deflection values are positive downward. `reversed` on YAxis means higher values render lower on the chart — the beam bows downward visually. This matches the BMD convention.

Wrap all three chart divs inside a single container div:
```tsx
<div className="space-y-4 mb-4 bg-white p-3 border rounded">
  <div ref={bmdRef}>...</div>  {/* BMD chart */}
  <div ref={sfdRef}>...</div>  {/* SFD chart */}
  <div ref={deflRef}>...</div> {/* Deflection chart */}
</div>
```

---

#### 4e — `src/utils/pdfExport.ts`

**Update `PdfExportArgs`:**
```typescript
import type { DesignInputs, CapacityResults, DiagramPoint, DeflectionProfilePoint } from '@/types';

export interface PdfExportArgs {
  inputs: DesignInputs;
  results: CapacityResults;
  bmd: DiagramPoint[];
  sfd: DiagramPoint[];
  deflectionGQ: DeflectionProfilePoint[];
  deflectionG: DeflectionProfilePoint[];
}
```

Remove `chartContainer` from args — the new path is always vector.

**Add `drawDeflectionDiagram` helper** after the existing `drawDiagram` function:
```typescript
function drawDeflectionDiagram(
  doc: jsPDF,
  gqPoints: DeflectionProfilePoint[],
  gPoints: DeflectionProfilePoint[],
  limitGQ: number,
  limitG: number,
  passGQ: boolean,
  passG: boolean,
  span: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  label: string,
): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(label, originX, originY - 2);
  doc.setFont('helvetica', 'normal');

  // Axes
  doc.setDrawColor(180, 180, 180);
  doc.line(originX, originY, originX + width, originY);  // baseline (zero deflection)
  doc.line(originX, originY, originX, originY + height);

  if (gqPoints.length < 2 || span <= 0) return;

  const allDeltas = [...gqPoints.map(p => p.delta), ...gPoints.map(p => p.delta), limitGQ, limitG];
  const maxDelta = Math.max(...allDeltas.map(v => Math.abs(v)), 1e-9);
  const xScale = width / span;
  const yScale = (height * 0.85) / maxDelta;

  // G+Q line (blue)
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  for (let i = 1; i < gqPoints.length; i++) {
    doc.line(
      originX + gqPoints[i-1].x * xScale, originY + gqPoints[i-1].delta * yScale,
      originX + gqPoints[i].x * xScale,   originY + gqPoints[i].delta * yScale,
    );
  }

  // G line (grey dashed — approximate with short segments)
  doc.setDrawColor(150, 150, 150);
  for (let i = 1; i < gPoints.length; i += 2) {
    doc.line(
      originX + gPoints[i-1].x * xScale, originY + gPoints[i-1].delta * yScale,
      originX + gPoints[i].x * xScale,   originY + gPoints[i].delta * yScale,
    );
  }

  // Limit lines
  const gqColor = passGQ ? [22, 163, 74] : [220, 38, 38];
  const gColor  = passG  ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(...gqColor as [number, number, number]);
  doc.setLineWidth(0.2);
  doc.line(originX, originY + limitGQ * yScale, originX + width, originY + limitGQ * yScale);
  doc.text(`L/${Math.round(span / (limitGQ / 1000))}`, originX + width + 1, originY + limitGQ * yScale + 1, { maxWidth: 15 });

  doc.setDrawColor(...gColor as [number, number, number]);
  doc.line(originX, originY + limitG * yScale, originX + width, originY + limitG * yScale);

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}
```

**Update `exportToPDF`** — replace the entire Diagrams section (currently starting at `// ===== Diagrams =====`) with explicit three-chart vector layout:

```typescript
// ===== Diagrams =====
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(0, 0, 0);
doc.text('Diagrams', 10, 135);
doc.setFont('helvetica', 'normal');

drawDiagram(doc, bmd, 'moment', inputs.span, 10, 143, 190, 40, 'Bending Moment Diagram (kN·m)');
drawDiagram(doc, sfd, 'shear',  inputs.span, 10, 192, 190, 40, 'Shear Force Diagram (kN)');
drawDeflectionDiagram(
  doc,
  deflectionGQ, deflectionG,
  results.deflectionLimitGQ, results.deflectionLimitG,
  results.passes.deflectionGQ, results.passes.deflectionG,
  inputs.span, 10, 241, 190, 40,
  'Deflection Profile (mm)',
);
```

Remove the `html2canvas` import and all `html2canvas` call paths. The vector renderer is now the only path.

**Update `handleExport` in `ResultsPanel.tsx`** to match new args:
```tsx
await exportToPDF({
  inputs,
  results,
  bmd: diagrams.factored,
  sfd: diagrams.factored,
  deflectionGQ: diagrams.deflectionGQ,
  deflectionG: diagrams.deflectionG,
});
```

**Acceptance:**
- tsc + build pass
- Deflection chart renders in the browser with G+Q (blue) and G (grey dashed) lines bowing downward
- L/300 and L/360 limit lines visible and colour-coded pass/fail
- PDF exports as single page with three diagrams visible at ~40mm each
- `html2canvas` is no longer imported

---

### Agent 5 — WB Section Build

**Objective:** Add Welded Beam (WB) as a selectable section type using the data produced by Agent 0.

**Pre-condition:** Agent 0 output (verified TypeScript array of 14 WB entries) must be available before this agent starts.

**Files touched:**
- `src/types/index.ts`
- `src/engineering/sections/sectionDatabase.ts`
- `src/engineering/sections/sectionUtils.ts`

---

#### 5a — `src/types/index.ts`

Extend `SectionType` union (Agent 4 also touches this file — ensure both changes are present):
```typescript
export type SectionType = 'UB' | 'UC' | 'PFC' | 'EA' | 'SHS' | 'CHS' | 'RHS' | 'WB';
```

---

#### 5b — `src/engineering/sections/sectionDatabase.ts`

1. Paste the Agent 0 TypeScript array verbatim as `const WB: SteelSection[] = [ ... ];` after the existing `const RHS` block.

2. Add `WB` to the `export const ALL_SECTIONS` (or equivalent export map). Check the current file for how section types are exported — look for the object or map that aggregates all arrays and add `WB`.

---

#### 5c — `src/engineering/sections/sectionUtils.ts`

Locate `getAllSectionTypes()` and add `'WB'`:
```typescript
export function getAllSectionTypes(): SectionType[] {
  return ['UB', 'UC', 'PFC', 'EA', 'SHS', 'CHS', 'RHS', 'WB'];
}
```

No changes to `calcFy` — WB sections use the same tf threshold rule (tf ≤ 17 mm → 300 MPa, tf > 17 mm → 280 MPa), which `calcFy` already implements generically from `section.tf`.

No changes to any engineering calculation modules — WB is treated as an I-section, identical to UB for classification and LTB purposes.

**Acceptance:**
- tsc + build pass
- `WB` appears in the Section type dropdown
- Selecting a WB section produces valid design results (no NaN/Infinity in outputs)
- Auto-select works when `WB` is selected as section type
- Section class, φMs, φMbx, φVv all compute without error for at least 700WB115 over a 10 m span

---

### Agent 6 — McVeigh Branding + PDF Header

**Objective:** Apply McVeigh Consultants branding via a CSS custom property theme system, add a branded header bar with SVG wordmark placeholder and theme switcher, and update the PDF report header.

**Pre-condition:** All Wave 1 and Wave 2 agents must be merged before this agent starts.

**Files touched:**
- `src/index.css`
- `src/App.tsx`
- `src/components/GeometryPanel.tsx`
- `src/components/LoadPanel.tsx`
- `src/components/RestraintPanel.tsx`
- `src/components/ResultsPanel.tsx`
- `src/utils/pdfExport.ts` (second touch — header only)

---

#### 6a — `src/index.css`

Add the McVeigh palette and theme overrides. Insert after existing Tailwind directives:

```css
:root {
  --mc-green-dark: #243C30;
  --mc-green-mid:  #2D4A3A;
  --mc-gold:       #C4A962;
  --mc-gold-light: #D4BE82;
  --mc-cream:      #F5F0E8;
}

/* McVeigh theme overrides */
[data-theme="mcveigh"] body {
  background-color: var(--mc-green-dark);
  color: var(--mc-cream);
}

[data-theme="mcveigh"] .mc-panel {
  background-color: var(--mc-green-mid);
  border-color: var(--mc-green-dark);
  color: var(--mc-cream);
}

[data-theme="mcveigh"] .mc-heading {
  color: var(--mc-gold);
}

[data-theme="mcveigh"] .mc-label {
  color: var(--mc-gold-light);
}

[data-theme="mcveigh"] .mc-btn-primary {
  background-color: var(--mc-gold);
  color: var(--mc-green-dark);
}

[data-theme="mcveigh"] .mc-btn-primary:hover {
  background-color: var(--mc-gold-light);
}

[data-theme="mcveigh"] .mc-table-header {
  background-color: var(--mc-green-dark);
  color: var(--mc-gold);
}

[data-theme="mcveigh"] .mc-select {
  background-color: #ffffff;
  border-color: var(--mc-gold);
  color: #111;
}
```

**Inputs stay white in both themes** — do not override input field backgrounds.  
**Semantic colours are unchanged in both themes** — `bg-green-500` (PASS), `bg-red-500` (FAIL), Recharts line colours.

---

#### 6b — `src/App.tsx`

**Theme state and persistence:**
```tsx
const [theme, setTheme] = React.useState<'mcveigh' | 'light'>(
  () => (localStorage.getItem('mc-theme') as 'mcveigh' | 'light') ?? 'mcveigh'
);

React.useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mc-theme', theme);
}, [theme]);
```

**Header bar** — add above the existing split-panel layout:
```tsx
<header style={{ backgroundColor: 'var(--mc-green-dark)' }} className="w-full px-6 py-3 flex items-center justify-between">
  {/* Left — app title */}
  <h1 style={{ color: 'var(--mc-gold)' }} className="text-lg font-bold tracking-wide">
    Steel Beam Design Tool
  </h1>

  {/* Right — SVG wordmark + theme switcher */}
  <div className="flex items-center gap-4">
    {/* SVG placeholder wordmark — swap for real logo asset later */}
    <svg width="160" height="32" viewBox="0 0 160 32" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="22" fontFamily="serif" fontSize="14" fontWeight="bold" fill="#C4A962">
        McVeigh Consultants
      </text>
    </svg>

    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as 'mcveigh' | 'light')}
      style={{ backgroundColor: 'var(--mc-green-mid)', color: 'var(--mc-gold)', border: '1px solid var(--mc-gold)' }}
      className="text-sm rounded px-2 py-1"
    >
      <option value="mcveigh">McVeigh</option>
      <option value="light">Light</option>
    </select>
  </div>
</header>
```

---

#### 6c — Component updates

For each of the four panel components, apply the theme utility classes defined in §6a. **Do not remove existing Tailwind classes** — add the `mc-*` classes alongside them. The CSS selectors in index.css only activate under `[data-theme="mcveigh"]`, so in Light mode the existing Tailwind classes continue to control appearance.

**Pattern for each panel's outer `<section>`:**
```tsx
// Before:
<section className="border rounded p-4 mb-4 bg-white shadow-sm">
  <h2 className="text-lg font-semibold mb-3">...</h2>

// After:
<section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
  <h2 className="text-lg font-semibold mb-3 mc-heading">...</h2>
```

**Pattern for primary buttons (blue):**
```tsx
// Before:
className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1"

// After:
className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 mc-btn-primary"
```

**Pattern for `<select>` dropdowns:**
```tsx
className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
```

**Pattern for `<label>` text:**
```tsx
className="text-sm font-medium block mc-label"
```

**Results panel capacity table header row:**
```tsx
// Before:
<tr className="bg-gray-100">

// After:
<tr className="bg-gray-100 mc-table-header">
```

Apply consistently across `GeometryPanel.tsx`, `LoadPanel.tsx`, `RestraintPanel.tsx`, and `ResultsPanel.tsx`.

---

#### 6d — `src/utils/pdfExport.ts` (second touch — header only)

In `exportToPDF`, replace the header section:

```typescript
// ===== Header =====
// McVeigh branded header bar
doc.setFillColor(36, 60, 48);  // --mc-green-dark
doc.rect(0, 0, 210, 20, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.setTextColor(196, 169, 98);  // --mc-gold
doc.text('McVeigh Consultants', 10, 12);

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(245, 240, 232);  // --mc-cream
doc.text('Steel Beam Design Report', 10, 18);

doc.setTextColor(245, 240, 232);
doc.setFontSize(9);
doc.text(new Date().toLocaleDateString(), 170, 12);
```

Adjust all subsequent `y` coordinates down by ~5mm to account for the taller header bar (header now occupies 0–20mm instead of 0–15mm). Check that the table and diagrams still fit within the page.

**Acceptance:**
- tsc + build pass
- McVeigh theme applies on selecting "McVeigh" from header dropdown
- Light theme restores default appearance
- Theme preference persists across page refresh (localStorage)
- Header bar visible with gold wordmark and theme switcher
- PDF report shows McVeigh header bar and updated title text
- Input field backgrounds remain white in McVeigh theme
- PASS/FAIL banner, chart line colours unchanged in McVeigh theme

---

## 5. Logo Asset Note

The header SVG wordmark in §6b is a placeholder. To swap in the real logo:

1. Drop the logo file (SVG preferred) into `steel-beam-tool/public/logo.svg`
2. Replace the `<svg>` block in `App.tsx` with:
   ```tsx
   <img src="/logo.svg" alt="McVeigh Consultants" height={32} />
   ```

No other changes required.

---

## 6. Summary Table

| Agent | Wave | Files | Parallel with |
|---|---|---|---|
| 0 — WB Research | Pre | (output only) | — |
| 1 — Load Panel Headers | 1 | `LoadPanel.tsx` | 2, 3 |
| 2 — Auto-Select Feedback | 1 | `GeometryPanel.tsx` | 1, 3 |
| 3 — Capacity Reference Lines | 1 | `ResultsPanel.tsx` | 1, 2 |
| 4 — Deflection Chart + PDF | 2 | `deflection.ts`, `evaluate.ts`, `types/index.ts`, `ResultsPanel.tsx`, `pdfExport.ts` | 5 |
| 5 — WB Section Build | 2 | `types/index.ts`, `sectionDatabase.ts`, `sectionUtils.ts` | 4 |
| 6 — McVeigh Branding | 3 | `index.css`, `App.tsx`, all 4 panels, `pdfExport.ts` | — |
