# Steel Beam Tool — Rev 2 Handover Document
**For:** Planning / implementation agent  
**Date:** 2026-05-26  
**Do not execute — planning document only**

---

## Project context

- **App:** McVeigh Steel Designer — browser-based AS4100/AS1170 steel beam design tool
- **Stack:** React 18 + TypeScript + Vite, client-side only, no network calls
- **Root:** `C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool\`
- **Current state:** Build passes, dev server runs at `localhost:5173`, McVeigh dark-green/gold theme active

---

## Changes to implement (7 items)

---

### 1. Remove leading zeros from all numeric inputs

**Problem:** When a user manually types into any `type="number"` input (e.g. "010" in Span, "05" in Start (m)), the browser can display leading zeros during and after entry.

**Fix:** Add an `onBlur` handler to every `type="number"` input across the entire app. On blur, re-fire the same update callback with `parseFloat(e.target.value)`, which causes React to re-render the controlled input with the clean numeric string (no leading zeros).

**Scope — every numeric input in these files:**
- `src/components/GeometryPanel.tsx` — Span, Tributary width, Le/L multiplier
- `src/components/LoadPanel.tsx` — all magnitude, position, start, end fields across Point, Line, and Area loads
- `src/components/RestraintPanel.tsx` — restraint position fields and αm override field

**Pattern to apply to every `type="number"` input:**
```tsx
// existing onChange handler stays unchanged
onChange={(e) => updateFoo({ field: parseFloat(e.target.value) || 0 })}
// add onBlur that re-fires the same update
onBlur={(e) => updateFoo({ field: parseFloat(e.target.value) || 0 })}
```

React's controlled value will then re-render as `String(numericValue)`, which has no leading zeros.

---

### 2. Replace placeholder logo with actual McVeigh logo

**Current state:** `App.tsx` header contains an inline `<svg>` placeholder with a comment "swap for /logo.svg later".

**Action:**
1. Copy the image at `.Improvements\Rev 2\2.jpg` into `steel-beam-tool/public/logo.jpg`.
2. In `App.tsx`, replace the inline `<svg>` block with:
   ```tsx
   <img src="/logo.jpg" alt="McVeigh Consultants" className="h-10 w-auto" />
   ```
   `h-10` (40px height) is the recommended starting size — adjust if it looks too large or small against the header height (`py-3`).

**Constraint:** The logo JPG has a dark green background (`#243C30`) that matches `--mc-green-dark`, so it will sit flush in the header with no visible border. No background treatment needed.

---

### 3. Rename the app

**Three locations to update:**

| Location | Current | New |
|---|---|---|
| `App.tsx` header `<h1>` | "Steel Beam Design Tool" | "McVeigh Steel Designer" |
| `index.html` `<title>` | (whatever is current) | "Steel Designer" |
| `src/utils/pdfExport.ts` report header | (whatever is current) | "McVeigh Steel Designer" |

No other files reference the app name.

---

### 4. Add a tab bar below the header ("Steel Beam" tab)

**Intent:** The app will eventually host multiple tools (Steel Column, Connection Design, etc.) under the McVeigh Steel Designer umbrella. A tab bar below the header sets up that structure now.

**Current layout in `App.tsx`:**
```
<header>          ← dark green, full width
<div flex-1>      ← two-column split (inputs left, results right)
```

**New layout:**
```
<header>          ← dark green, full width (unchanged)
<nav>             ← tab bar, full width, below header
<div flex-1>      ← two-column split (unchanged)
```

**Tab bar spec:**
- Full-width `<nav>` element, background `var(--mc-green-mid)` (`#2D4A3A`), border-bottom `1px solid var(--mc-gold)`
- Single tab: "Steel Beam", active state (selected), styled with gold underline or background highlight
- Tab is not yet clickable/functional — it is active by default and is a placeholder for future routing
- Future tabs will be added as separate items in this nav when new tools are built

**Suggested tab styling (active):**
```tsx
<nav style={{ backgroundColor: 'var(--mc-green-mid)', borderBottom: '2px solid var(--mc-gold)' }} className="px-4 flex">
  <button
    style={{ color: 'var(--mc-gold)', borderBottom: '2px solid var(--mc-gold)' }}
    className="px-4 py-2 text-sm font-medium -mb-px"
  >
    Steel Beam
  </button>
</nav>
```

---

### 5. Ensure capacity reference lines are always displayed on all three charts

**Problem:** The reference lines (φMbx, φMs on BMD; ±φVv on SFD; L/300, L/360 on Deflection) are currently not visible in the screenshot — they appear to be conditionally rendered or hidden.

**Fix location:** `src/components/ResultsPanel.tsx`

**Check and fix for each chart:**

**BMD chart** — ensure these two `<ReferenceLine>` components render whenever `results` is non-null:
```tsx
<ReferenceLine y={-results.phiMbx} stroke={results.momentPass ? 'green' : 'red'} strokeDasharray="4 2" label={{ value: `φMbx ${results.phiMbx.toFixed(1)}`, position: 'insideTopRight', fontSize: 10 }} />
<ReferenceLine y={-results.phiMs} stroke="gray" strokeDasharray="2 2" label={{ value: `φMs ${results.phiMs.toFixed(1)}`, position: 'insideBottomRight', fontSize: 10 }} />
```

**SFD chart** — ensure ±φVv lines render whenever `results` is non-null:
```tsx
<ReferenceLine y={results.phiVv} stroke={results.shearPass ? 'green' : 'red'} strokeDasharray="4 2" label={{ value: `φVv ${results.phiVv.toFixed(1)}`, position: 'insideTopRight', fontSize: 10 }} />
<ReferenceLine y={-results.phiVv} stroke={results.shearPass ? 'green' : 'red'} strokeDasharray="4 2" />
```

**Deflection chart** — ensure L/300 and L/360 limit lines render whenever `results` is non-null:
```tsx
<ReferenceLine y={results.deflectionLimitGQ} stroke={results.deflGQPass ? 'green' : 'red'} strokeDasharray="4 2" label={{ value: `L/300 (${results.deflectionLimitGQ.toFixed(1)}mm)`, position: 'insideTopRight', fontSize: 10 }} />
<ReferenceLine y={results.deflectionLimitG} stroke={results.deflGPass ? 'green' : 'red'} strokeDasharray="2 2" label={{ value: `L/360 (${results.deflectionLimitG.toFixed(1)}mm)`, position: 'insideBottomRight', fontSize: 10 }} />
```

**Root cause to check first:** Look for any conditional that wraps the `<ReferenceLine>` components (e.g. `{results && ...}` or `{somePassFlag && ...}`) and remove it so they always render when `results` is non-null.

---

### 6. Restraints — replace intermediate position list with count-based equal spacing

**Scope:** Advanced mode only. Simple mode (FF/PP/PF/FC/custom) is unchanged. End A and End B dropdowns within Advanced mode are unchanged.

**Current behaviour (to replace):**  
Advanced mode has a manual list of position inputs (e.g. "2 m", "3 m", "4 m") each with a Remove button, plus a "+ Add" button that appends a new position.

**New behaviour:**  
Replace the intermediate restraints section (the heading, "+ Add" button, and position input list) with:
1. A single labelled number input: **"Number of intermediate restraints"** (integer, min 0)
2. Read-only computed positions displayed below: e.g. `"Positions: 2.50 m, 5.00 m, 7.50 m"`

**Engineering calculation — no changes needed.** `calcEffectiveLength` in `effectiveLength.ts` consumes `restraint.intermediate: number[]`. The panel must continue to populate this array with the computed positions before passing to state.

**Position computation:** For N restraints on span L:  
`positions = [L/(N+1), 2L/(N+1), ..., N·L/(N+1)]`

**Data model approach:**  
- Keep `intermediate: number[]` in `RestraintConfig` (types and engineering layer unchanged)  
- Add local `intermediateCount: number` state inside `RestraintPanel` component only (not in `DesignInputs`)  
- When count changes: compute positions → call `updateRestraint({ intermediate: positions })`
- When span changes (received via `inputs.span`): recompute positions from current count → call `updateRestraint({ intermediate: positions })`

**UI implementation in `RestraintPanel.tsx`:**
```tsx
// Local state — not persisted to DesignInputs
const [intermediateCount, setIntermediateCount] = useState(0);

// Derived positions
const computedPositions = Array.from({ length: intermediateCount }, (_, i) =>
  parseFloat(((inputs.span / (intermediateCount + 1)) * (i + 1)).toFixed(3))
);

// Sync to DesignInputs whenever count or span changes
useEffect(() => {
  updateRestraint({ intermediate: computedPositions });
}, [intermediateCount, inputs.span]);

// UI
<div className="mt-3">
  <label className="text-sm font-medium">Number of intermediate restraints</label>
  <input
    type="number"
    min={0}
    step={1}
    value={intermediateCount}
    onChange={(e) => setIntermediateCount(Math.max(0, parseInt(e.target.value) || 0))}
    onBlur={(e) => setIntermediateCount(Math.max(0, parseInt(e.target.value) || 0))}
    className="mt-1 w-24 border rounded px-2 py-1"
  />
  {intermediateCount > 0 && (
    <p className="text-xs mt-1 text-gray-500">
      Positions: {computedPositions.map(p => `${p.toFixed(2)} m`).join(', ')}
    </p>
  )}
</div>
```

**Remove from `RestraintPanel.tsx`:** `addIntermediate`, `updateInterm`, `removeInterm` helper functions, the `+ Add` button, and the mapped position input list.

---

### 7. Auto-update line and area load End (m) when span changes

**Behaviour:** Whenever the span input changes, update the `end` field of every existing line load and every existing area load to match the new span value. The End field remains fully editable — this is not a lock, just an automatic sync.

**Implementation location:** `App.tsx` — the `handleChange` function (or a dedicated span-change handler).

**Current `handleChange`:**
```tsx
const handleChange = (patch: Partial<DesignInputs>) =>
  setInputs(prev => ({ ...prev, ...patch }));
```

**Replace with:**
```tsx
const handleChange = (patch: Partial<DesignInputs>) =>
  setInputs(prev => {
    const next = { ...prev, ...patch };
    if (patch.span !== undefined) {
      next.loads = {
        ...next.loads,
        line: next.loads.line.map(l => ({ ...l, end: patch.span! })),
        area: next.loads.area.map(a => ({ ...a, end: patch.span! })),
      };
    }
    return next;
  });
```

**Notes:**
- Point loads have no `end` field — unaffected.
- New loads added after a span change already default to `end: inputs.span` (see `addLine` / `addArea` in `LoadPanel.tsx`) — no change needed there.
- The End field in `LoadPanel.tsx` remains a normal editable input — no read-only treatment.

---

## Files changed summary

| File | Changes |
|---|---|
| `src/App.tsx` | App name in header; tab bar below header; `handleChange` span-sync for loads |
| `index.html` | `<title>` → "Steel Designer" |
| `src/utils/pdfExport.ts` | Report header → "McVeigh Steel Designer" |
| `src/components/GeometryPanel.tsx` | `onBlur` leading-zero fix on all number inputs |
| `src/components/LoadPanel.tsx` | `onBlur` leading-zero fix on all number inputs |
| `src/components/RestraintPanel.tsx` | `onBlur` fix; replace intermediate position list with count input + read-only preview |
| `src/components/ResultsPanel.tsx` | Ensure all reference lines (φMbx, φMs, φVv, L/300, L/360) always render when results non-null |
| `public/logo.jpg` | New file — copy from `.Improvements\Rev 2\2.jpg` |

**No changes required to:**
- Any engineering calculation module (`as4100/`, `as1170/`, `sections/`, `evaluate.ts`)
- `src/types/index.ts`
- `src/hooks/useDesignCalculations.ts`
- `vite.config.ts`, `tailwind.config.js`, `index.css`
