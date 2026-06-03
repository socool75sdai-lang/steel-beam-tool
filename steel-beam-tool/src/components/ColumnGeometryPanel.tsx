import React from 'react';
import type { SteelGrade, HollowSteelGrade } from '@/types';
import type { ColumnInputs, ColumnSectionType } from '@/types/column';
import { getSectionsByType } from '@/engineering/sections/sectionUtils';
import { evaluateColumn } from '@/engineering/as4100/columnCapacity';

interface ColumnGeometryPanelProps {
  inputs: ColumnInputs;
  onChange: (patch: Partial<ColumnInputs>) => void;
}

const COLUMN_TYPES: ColumnSectionType[] = ['UC', 'SHS', 'RHS', 'CHS'];

const UC_GRADES: { value: SteelGrade; label: string }[] = [
  { value: 'G300', label: 'Grade 300' },
  { value: 'G350', label: 'Grade 350' },
];

const HOLLOW_GRADES: { value: HollowSteelGrade; label: string }[] = [
  { value: 'C250', label: 'Grade 250' },
  { value: 'C350', label: 'Grade 350' },
  { value: 'C450', label: 'Grade 450' },
];

export function ColumnGeometryPanel({ inputs, onChange }: ColumnGeometryPanelProps) {
  const [autoMsg, setAutoMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
  const sectionsForType = getSectionsByType(inputs.sectionType);
  const isHollow = inputs.sectionType !== 'UC';
  const gradeOptions = isHollow ? HOLLOW_GRADES : UC_GRADES;

  const handleTypeChange = (newType: ColumnSectionType) => {
    setAutoMsg(null);
    const newSections = getSectionsByType(newType);
    const defaultGrade: SteelGrade | HollowSteelGrade = newType === 'UC' ? 'G300' : 'C350';
    onChange({
      sectionType: newType,
      steelGrade: defaultGrade,
      section: newSections[0],
    });
  };

  const handleSizeChange = (designation: string) => {
    const sec = sectionsForType.find((s) => s.designation === designation);
    if (sec) onChange({ section: sec });
  };

  const handleAutoSelect = () => {
    const candidates = getSectionsByType(inputs.sectionType); // sorted ascending by mass
    let chosen = null as (typeof candidates)[number] | null;
    for (const candidate of candidates) {
      const res = evaluateColumn({ ...inputs, section: candidate });
      if (res.passes.overall) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) {
      setAutoMsg({ text: `No passing section found in ${inputs.sectionType} — reduce loads or change type.`, ok: false });
      return;
    }
    if (chosen.designation === inputs.section.designation) {
      setAutoMsg({ text: `${chosen.designation} is already the lightest passing ${inputs.sectionType}.`, ok: true });
      return;
    }
    onChange({ section: chosen });
    setAutoMsg({ text: `Selected ${chosen.designation} — lightest passing ${inputs.sectionType}.`, ok: true });
  };

  const LeX = inputs.kx * inputs.height;
  const LeY = inputs.ky * inputs.height;

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">1. Geometry</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium block mc-label">
          Height (m)
          <input
            type="number"
            min={0}
            step={0.1}
            value={inputs.height}
            onChange={(e) => onChange({ height: parseFloat(e.target.value) || 0 })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onChange({ height: v });
              e.target.value = String(v);
            }}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
          {inputs.height <= 0 && <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>}
        </label>

        <label className="text-sm font-medium block mc-label">
          Section type
          <select
            value={inputs.sectionType}
            onChange={(e) => handleTypeChange(e.target.value as ColumnSectionType)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-sm font-medium block mc-label">
          Steel grade
          <select
            value={inputs.steelGrade}
            onChange={(e) => onChange({ steelGrade: e.target.value as SteelGrade | HollowSteelGrade })}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {gradeOptions.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
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

      <button
        type="button"
        onClick={handleAutoSelect}
        className="mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 mc-btn-primary"
      >
        Auto-select lightest
      </button>
      {autoMsg && (
        <p className={`mt-2 text-xs ${autoMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {autoMsg.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-sm font-medium block mc-label">
          k_x
          <input
            type="number"
            min={0}
            step={0.05}
            value={inputs.kx}
            onChange={(e) => onChange({ kx: parseFloat(e.target.value) || 0 })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onChange({ kx: v });
              e.target.value = String(v);
            }}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
        </label>
        <label className="text-sm font-medium block mc-label">
          k_y
          <input
            type="number"
            min={0}
            step={0.05}
            value={inputs.ky}
            onChange={(e) => onChange({ ky: parseFloat(e.target.value) || 0 })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onChange({ ky: v });
              e.target.value = String(v);
            }}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-sm mc-label">
        <div className="bg-gray-100 rounded px-2 py-1 text-gray-800">
          Le_x = k_x &times; L = {LeX.toFixed(2)} m
        </div>
        <div className="bg-gray-100 rounded px-2 py-1 text-gray-800">
          Le_y = k_y &times; L = {LeY.toFixed(2)} m
        </div>
      </div>
    </section>
  );
}
