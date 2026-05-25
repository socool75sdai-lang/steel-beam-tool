import type { DesignInputs, SectionType } from '@/types';
import { getSectionsByType, getAllSectionTypes } from '@/engineering/sections/sectionUtils';
import { autoSelectSection } from '@/engineering/sections/autoSelect';

interface GeometryPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function GeometryPanel({ inputs, onChange }: GeometryPanelProps) {
  const sectionTypes = getAllSectionTypes();
  const sectionsForType = getSectionsByType(inputs.section.type);

  const handleTypeChange = (newType: SectionType) => {
    const newSections = getSectionsByType(newType);
    if (newSections.length > 0) {
      onChange({ section: newSections[0] });
    }
  };

  const handleSizeChange = (designation: string) => {
    const sec = getSectionsByType(inputs.section.type).find(
      (s) => s.designation === designation,
    );
    if (sec) onChange({ section: sec });
  };

  const handleAutoSelect = () => {
    const result = autoSelectSection(inputs, inputs.section.type);
    if (result) {
      onChange({ section: result.section });
    } else {
      alert('No passing section found in ' + inputs.section.type);
    }
  };

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">1. Geometry</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium block">
          Span (m)
          <input
            type="number"
            min={0}
            step={0.1}
            value={inputs.span}
            onChange={(e) => onChange({ span: parseFloat(e.target.value) || 0 })}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
          {inputs.span <= 0 && (
            <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>
          )}
        </label>

        <label className="text-sm font-medium block">
          Tributary width (m)
          <input
            type="number"
            min={0}
            step={0.1}
            value={inputs.tributaryWidth}
            onChange={(e) =>
              onChange({ tributaryWidth: parseFloat(e.target.value) || 0 })
            }
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
          {inputs.tributaryWidth <= 0 && (
            <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-sm font-medium block">
          Section type
          <select
            value={inputs.section.type}
            onChange={(e) => handleTypeChange(e.target.value as SectionType)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          >
            {sectionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium block">
          Section size
          <select
            value={inputs.section.designation}
            onChange={(e) => handleSizeChange(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          >
            {sectionsForType.map((s) => (
              <option key={s.designation} value={s.designation}>
                {s.designation}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleAutoSelect}
        className="mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1"
      >
        Auto-select lightest
      </button>
    </section>
  );
}
