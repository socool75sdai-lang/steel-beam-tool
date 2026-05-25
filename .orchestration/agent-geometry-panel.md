# Agent: geometry-panel

**Wave:** 4
**Depends on:** Waves 1 + 3
**Output:** `src/components/GeometryPanel.tsx`

## Responsibility
Render the geometry input panel: span, tributary width, section type dropdown, section size dropdown, auto-select button.

## Component signature
```tsx
import { DesignInputs, SectionType, SteelSection } from '@/types';

interface GeometryPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function GeometryPanel({ inputs, onChange }: GeometryPanelProps): JSX.Element;
```

## Implementation
- All inputs controlled via props — no internal state for input values.
- Section type `<select>` lists all `getAllSectionTypes()`.
- Section size `<select>` is filtered via `getSectionsByType(inputs.section.type)`.
- Selecting a new type → auto-pick first section in that type via `getSectionsByType(type)[0]`.
- Auto-select button: calls `autoSelectSection(inputs, inputs.section.type)`; on result, `onChange({ section: result.section })`; on null, alert "No passing section found in this type".
- Tailwind styling: `<section className="border rounded p-4 mb-4 bg-white shadow-sm">`, `<h2 className="text-lg font-semibold mb-3">`, `grid grid-cols-2 gap-3` for fields.

## Validation
- `span > 0`: show inline red text "Span must be > 0" when invalid.
- `tributaryWidth > 0`: same.

## Acceptance criteria
- Changing section type re-populates section size list.
- Auto-select button is wired and triggers state update on a passing match.
- `npx tsc --noEmit` passes.
