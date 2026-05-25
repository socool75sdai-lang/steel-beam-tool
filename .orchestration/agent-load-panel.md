# Agent: load-panel

**Wave:** 4
**Depends on:** Wave 1
**Output:** `src/components/LoadPanel.tsx`

## Responsibility
Render the loads input panel with three sub-sections: Point Loads, Line Loads, Area Loads — each with add/remove rows.

## Component signature
```tsx
import { DesignInputs, PointLoad, LineLoad, AreaLoad } from '@/types';

interface LoadPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function LoadPanel({ inputs, onChange }: LoadPanelProps): JSX.Element;
```

## Implementation
- Three sub-sections rendered in order with headers: "Point Loads (kN)", "Line Loads / UDL (kN/m)", "Area Loads (kPa)".
- Each row:
  - Point: magnitude / position / G·Q toggle / delete
  - Line: magnitude / start / end / G·Q toggle / delete
  - Area: magnitude / start / end / G·Q toggle / delete
- Each sub-section has an "+ Add" button.
- ID generation: `crypto.randomUUID()` (browser API).
- G/Q toggle: small two-button group.
- Self-weight row displayed under Line Loads as read-only: `Self-weight (auto, G): {kN/m} over full span`.
- `onChange` patches `{ loads: { ...inputs.loads, point: newArray } }`.

## Validation (visual hint only — does not block input)
- Position must be in `[0, span]`. Show inline warning if out of range.
- Start < End for line/area loads. Show inline warning if not.

## Styling
Tailwind: `<section className="border rounded p-4 mb-4 bg-white shadow-sm">`, table-style grid for rows. Add buttons styled `bg-blue-500 text-white rounded px-3 py-1`.

## Acceptance criteria
- Can add and remove rows of each load type.
- Editing a row updates `inputs.loads` via `onChange`.
- Self-weight summary text is visible and reflects selected section.
- `npx tsc --noEmit` passes.
