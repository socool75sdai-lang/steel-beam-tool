import type { LiveLoadType } from '@/types';
import type { BraceInputs, BraceResults, BracePointLoad, BraceLoadTag } from '@/types/brace';
import { LIVE_LOAD_LABELS } from '@/engineering/as1170/psiFactors';

interface BraceLoadPanelProps {
  inputs: BraceInputs;
  results: BraceResults;
  onChange: (patch: Partial<BraceInputs>) => void;
}

const TAGS: BraceLoadTag[] = ['G', 'Q', 'Wind'];

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `pl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function BraceLoadPanel({ inputs, results, onChange }: BraceLoadPanelProps) {
  const im = results.intermediates;

  const updateLoad = (id: string, patch: Partial<BracePointLoad>) =>
    onChange({ pointLoads: inputs.pointLoads.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const addLoad = () =>
    onChange({
      pointLoads: [
        ...inputs.pointLoads,
        { id: newId(), position: inputs.span / 2, magnitude: 0, tag: 'Q' },
      ],
    });

  const removeLoad = (id: string) =>
    onChange({ pointLoads: inputs.pointLoads.filter((p) => p.id !== id) });

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">2. Loads</h2>

      <label className="text-sm font-medium block mc-label">
        Axial N* (kN) — single factored ultimate, applied in every combination
        <input
          type="number"
          min={0}
          step={1}
          value={inputs.nStar}
          onChange={(e) => onChange({ nStar: parseFloat(e.target.value) || 0 })}
          onBlur={(e) => {
            const v = parseFloat(e.target.value) || 0;
            onChange({ nStar: v });
            e.target.value = String(v);
          }}
          className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
        />
      </label>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium mc-label">Transverse point loads</span>
          <button
            type="button"
            onClick={addLoad}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs rounded px-2 py-1 mc-btn-primary"
          >
            + Add load
          </button>
        </div>
        {inputs.pointLoads.length === 0 && (
          <p className="text-xs mc-subtle">No transverse point loads. Self-weight is always included below.</p>
        )}
        {inputs.pointLoads.map((p) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-center mb-2">
            <input
              type="number"
              step={0.1}
              value={p.position}
              onChange={(e) => updateLoad(p.id, { position: parseFloat(e.target.value) || 0 })}
              className="col-span-3 border border-gray-300 rounded px-2 py-1 text-sm"
              title="Position from end A (m)"
            />
            <input
              type="number"
              step={0.5}
              value={p.magnitude}
              onChange={(e) => updateLoad(p.id, { magnitude: parseFloat(e.target.value) || 0 })}
              className="col-span-3 border border-gray-300 rounded px-2 py-1 text-sm"
              title="Magnitude (kN); Wind signed +down / -up"
            />
            <select
              value={p.tag}
              onChange={(e) => updateLoad(p.id, { tag: e.target.value as BraceLoadTag })}
              className="col-span-4 border border-gray-300 rounded px-2 py-1 text-sm mc-select"
            >
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t === 'Wind' ? 'Wind (signed)' : t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeLoad(p.id)}
              className="col-span-2 text-red-600 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <p className="text-xs mc-subtle">Columns: position (m) · magnitude (kN) · action tag. Wind entered signed (+down / −up).</p>
      </div>

      <label className="text-sm font-medium block mc-label mt-4">
        Live-load category (drives ψc / ψl)
        <select
          value={inputs.liveLoadType}
          onChange={(e) => onChange({ liveLoadType: e.target.value as LiveLoadType })}
          className="mt-1 w-full border border-gray-300 rounded px-2 py-1 mc-select"
        >
          {(Object.keys(LIVE_LOAD_LABELS) as LiveLoadType[]).map((k) => (
            <option key={k} value={k}>
              {LIVE_LOAD_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium block mc-label mt-3">
        Deflection limit: span /
        <input
          type="number"
          step={10}
          value={inputs.deflLimit}
          onChange={(e) => onChange({ deflLimit: parseInt(e.target.value, 10) || 360 })}
          className="ml-2 w-24 border border-gray-300 rounded px-2 py-1"
        />
      </label>

      <div className="mt-4 bg-gray-100 rounded p-3 text-sm text-gray-800 space-y-1">
        <p className="font-medium text-gray-700">Self-weight &amp; combinations</p>
        <p>Self-weight UDL (G) = {im.selfWeightKnPerM.toFixed(3)} kN/m (auto-included)</p>
        <p>Combos: 1.2G+1.5Q · 1.2G+Wu+ψc·Q · 0.9G+Wu (ψc = {im.psiC})</p>
        <p>Governing bending combo: {results.govCombo} → M* = {results.mStar.toFixed(2)} kN·m</p>
      </div>
    </section>
  );
}
