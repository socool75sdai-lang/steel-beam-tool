import React from 'react';
import type { DesignInputs, SectionType, SteelGrade, SupportCondition } from '@/types';
import { getSectionsByType, getAllSectionTypes } from '@/engineering/sections/sectionUtils';
import { autoSelectSection } from '@/engineering/sections/autoSelect';

interface GeometryPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function GeometryPanel({ inputs, onChange }: GeometryPanelProps) {
  const sectionTypes = getAllSectionTypes();
  const sectionsForType = getSectionsByType(inputs.section.type);
  const [autoSelectMsg, setAutoSelectMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

  const handleTypeChange = (newType: SectionType) => {
    setAutoSelectMsg(null);
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

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">1. Geometry</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium block mc-label">
          Span (m)
          <input
            type="number"
            min={0}
            step={0.1}
            value={inputs.span}
            onChange={(e) => onChange({ span: parseFloat(e.target.value) || 0 })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onChange({ span: v });
              e.target.value = String(v);
            }}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
          {inputs.span <= 0 && (
            <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>
          )}
        </label>

        <label className="text-sm font-medium block mc-label">
          Tributary width (m)
          <input
            type="number"
            min={0}
            step={0.1}
            value={inputs.tributaryWidth}
            onChange={(e) =>
              onChange({ tributaryWidth: parseFloat(e.target.value) || 0 })
            }
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onChange({ tributaryWidth: v });
              e.target.value = String(v);
            }}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
          {inputs.tributaryWidth <= 0 && (
            <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>
          )}
        </label>
      </div>

      <div className="mt-3">
        <label className="text-sm font-medium block mc-label">
          Support Conditions
          <select
            value={inputs.supportCondition}
            onChange={(e) => onChange({ supportCondition: e.target.value as SupportCondition })}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            <option value="PP">Pin–Pin (default)</option>
            <option value="FP">Fixed–Pin (End A fixed, End B pin)</option>
            <option value="PF">Pin–Fixed (End A pin, End B fixed)</option>
            <option value="FF">Fixed–Fixed</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-sm font-medium block mc-label">
          Section type
          <select
            value={inputs.section.type}
            onChange={(e) => handleTypeChange(e.target.value as SectionType)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {sectionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium block mc-label">
          Section size
          <select
            value={inputs.section.designation}
            onChange={(e) => handleSizeChange(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {sectionsForType.map((s) => (
              <option key={s.designation} value={s.designation}>
                {s.designation}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-sm font-medium block mc-label">
          Steel Grade
          <select
            value={inputs.steelGrade}
            onChange={(e) => onChange({ steelGrade: e.target.value as SteelGrade })}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            <option value="G300">Grade 300</option>
            <option value="G350">Grade 350</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleAutoSelect}
        className="mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 mc-btn-primary"
      >
        Auto-select lightest
      </button>
      {autoSelectMsg && (
        <p className={`mt-2 text-xs ${autoSelectMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {autoSelectMsg.text}
        </p>
      )}
    </section>
  );
}
