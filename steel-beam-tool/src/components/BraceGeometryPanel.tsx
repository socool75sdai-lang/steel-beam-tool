import React from 'react';
import type { HollowSteelGrade } from '@/types';
import type { BraceInputs, BraceSectionType } from '@/types/brace';
import { getSectionsByType } from '@/engineering/sections/sectionUtils';
import { evaluateBrace } from '@/engineering/as4100/braceCapacity';

interface BraceGeometryPanelProps {
  inputs: BraceInputs;
  onChange: (patch: Partial<BraceInputs>) => void;
}

const BRACE_TYPES: BraceSectionType[] = ['CHS', 'SHS', 'RHS'];

const HOLLOW_GRADES: { value: HollowSteelGrade; label: string }[] = [
  { value: 'C250', label: 'Grade 250' },
  { value: 'C350', label: 'Grade 350' },
  { value: 'C450', label: 'Grade 450' },
];

export function BraceGeometryPanel({ inputs, onChange }: BraceGeometryPanelProps) {
  const [autoMsg, setAutoMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
  const sectionsForType = getSectionsByType(inputs.sectionType);

  const handleTypeChange = (newType: BraceSectionType) => {
    setAutoMsg(null);
    onChange({ sectionType: newType, section: getSectionsByType(newType)[0] });
  };

  const handleSizeChange = (designation: string) => {
    const sec = sectionsForType.find((s) => s.designation === designation);
    if (sec) onChange({ section: sec });
  };

  // DEVIATION from beam/column auto-select: search the FULL matrix
  // {CHS, SHS, RHS} × {C250, C350, C450} and pick the GLOBAL lightest passing
  // section, setting type + grade + size together.
  const handleAutoSelect = () => {
    const grades: HollowSteelGrade[] = ['C250', 'C350', 'C450'];
    let best: { type: BraceSectionType; grade: HollowSteelGrade; designation: string; mass: number } | null = null;
    for (const type of BRACE_TYPES) {
      for (const candidate of getSectionsByType(type)) {
        for (const grade of grades) {
          const res = evaluateBrace({ ...inputs, sectionType: type, steelGrade: grade, section: candidate });
          if (res.passes.overall) {
            if (!best || candidate.mass_kg_m < best.mass) {
              best = { type, grade, designation: candidate.designation, mass: candidate.mass_kg_m };
            }
            break; // lightest passing grade for this section reached (grades irrelevant to mass)
          }
        }
      }
    }
    if (!best) {
      setAutoMsg({ text: 'No passing section across CHS/SHS/RHS × C250/C350/C450 — reduce loads or span.', ok: false });
      return;
    }
    const sec = getSectionsByType(best.type).find((s) => s.designation === best!.designation);
    if (!sec) return;
    onChange({ sectionType: best.type, steelGrade: best.grade, section: sec });
    setAutoMsg({
      text: `Selected ${best.designation} (${best.type}, ${best.grade}) — global lightest passing (${best.mass.toFixed(1)} kg/m).`,
      ok: true,
    });
  };

  const LeX = inputs.kx * inputs.span;
  const LeY = inputs.ky * inputs.span;

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">1. Geometry</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium block mc-label">
          Span L (m)
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
          {inputs.span <= 0 && <p className="text-xs text-red-600 mt-1">Must be &gt; 0</p>}
        </label>

        <label className="text-sm font-medium block mc-label">
          Section type
          <select
            value={inputs.sectionType}
            onChange={(e) => handleTypeChange(e.target.value as BraceSectionType)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {BRACE_TYPES.map((t) => (
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
            onChange={(e) => onChange({ steelGrade: e.target.value as HollowSteelGrade })}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
          >
            {HOLLOW_GRADES.map((g) => (
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
        Auto-lightest (all types &amp; grades)
      </button>
      {autoMsg && (
        <p className={`mt-2 text-xs ${autoMsg.ok ? 'text-green-700' : 'text-red-600'}`}>{autoMsg.text}</p>
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
