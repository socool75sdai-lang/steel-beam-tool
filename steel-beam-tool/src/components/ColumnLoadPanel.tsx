import type { ColumnInputs, ColumnResults } from '@/types/column';

interface ColumnLoadPanelProps {
  inputs: ColumnInputs;
  results: ColumnResults;
  onChange: (patch: Partial<ColumnInputs>) => void;
}

export function ColumnLoadPanel({ inputs, results, onChange }: ColumnLoadPanelProps) {
  const numField = (
    label: string,
    value: number,
    key: keyof ColumnInputs,
  ) => (
    <label className="text-sm font-medium block mc-label">
      {label}
      <input
        type="number"
        step={key === 'ex' || key === 'ey' ? 1 : 0.1}
        value={value}
        onChange={(e) => onChange({ [key]: parseFloat(e.target.value) || 0 } as Partial<ColumnInputs>)}
        onBlur={(e) => {
          const v = parseFloat(e.target.value) || 0;
          onChange({ [key]: v } as Partial<ColumnInputs>);
          e.target.value = String(v);
        }}
        className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
      />
    </label>
  );

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">2. Loads</h2>

      <div className="grid grid-cols-2 gap-3">
        {numField('G (kN)', inputs.G, 'G')}
        {numField('Q (kN)', inputs.Q, 'Q')}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {numField('e_x (mm)', inputs.ex, 'ex')}
        {numField('e_y (mm)', inputs.ey, 'ey')}
      </div>

      <div className="mt-4 bg-gray-100 rounded p-3 text-sm text-gray-800 space-y-1">
        <p className="font-medium text-gray-700">Factored actions (AS1170.1)</p>
        <p>N* = max(1.2G + 1.5Q, G) = {results.nStar.toFixed(1)} kN</p>
        <p>M*x = N* &times; e_y / 1000 = {results.mStarX.toFixed(2)} kN&middot;m</p>
        <p>M*y = N* &times; e_x / 1000 = {results.mStarY.toFixed(2)} kN&middot;m</p>
        <p className="text-xs text-gray-500">N_serv = G + Q = {(inputs.G + inputs.Q).toFixed(1)} kN</p>
      </div>
    </section>
  );
}
