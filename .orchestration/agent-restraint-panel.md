# Agent: restraint-panel

**Wave:** 4
**Depends on:** Wave 1
**Output:** `src/components/RestraintPanel.tsx`

## Responsibility
Render the restraint configuration panel with Simple/Advanced mode toggle.

## Component signature
```tsx
import { DesignInputs, SimpleRestraint, EndRestraint } from '@/types';

interface RestraintPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function RestraintPanel({ inputs, onChange }: RestraintPanelProps): JSX.Element;
```

## Implementation
- Mode toggle (Simple | Advanced) at top.

### Simple mode
Radio group of `simpleType` options:
- FF — Both ends fully restrained (Le/L=1.0)
- PP — Pin-pin (Le/L=1.0)
- PF — Pin-fixed (Le/L=1.2)
- FC — Cantilever (Le/L=0.7)
- Custom — user `Le/L` multiplier (numeric input)

When `simpleType === 'custom'`, show `leMultiplier` numeric input.

### Advanced mode
- End A restraint: radio F/P/L/U
- End B restraint: radio F/P/L/U
- Intermediate restraints: list of numeric inputs (position in m); add/remove buttons.

### αm override
Checkbox "Override αm" — when checked, show numeric input. When unchecked, set `alphaMOverride: null`. Otherwise pass the numeric value.

## Styling
Tailwind: `<section className="border rounded p-4 mb-4 bg-white shadow-sm">`, labels with `text-sm font-medium`, radio rows with `flex gap-3`.

## Acceptance criteria
- Toggling Simple/Advanced switches the visible controls without losing other inputs.
- Custom `Le/L` input only visible when `simpleType === 'custom'`.
- αm override clears (sets to null) when checkbox is unchecked.
- `npx tsc --noEmit` passes.
