import type { DesignInputs, PointLoad, LineLoad, AreaLoad, LoadCategory, LiveLoadType } from '@/types';
import { calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';
import { LIVE_LOAD_LABELS, PSI_L_FACTORS } from '@/engineering/as1170/psiFactors';

interface LoadPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

export function LoadPanel({ inputs, onChange }: LoadPanelProps) {
  const updateLoads = (
    key: 'point' | 'line' | 'area',
    newArr: PointLoad[] | LineLoad[] | AreaLoad[],
  ) => {
    onChange({ loads: { ...inputs.loads, [key]: newArr } });
  };

  // Point load helpers
  const addPoint = () =>
    updateLoads('point', [
      ...inputs.loads.point,
      { id: crypto.randomUUID(), magnitude: 0, position: 0, category: 'G' satisfies LoadCategory },
    ]);
  const updatePoint = (id: string, patch: Partial<PointLoad>) =>
    updateLoads(
      'point',
      inputs.loads.point.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const removePoint = (id: string) =>
    updateLoads(
      'point',
      inputs.loads.point.filter((p) => p.id !== id),
    );

  // Line load helpers
  const addLine = () =>
    updateLoads('line', [
      ...inputs.loads.line,
      {
        id: crypto.randomUUID(),
        magnitude: 0,
        start: 0,
        end: inputs.span,
        category: 'G' satisfies LoadCategory,
      },
    ]);
  const updateLine = (id: string, patch: Partial<LineLoad>) =>
    updateLoads(
      'line',
      inputs.loads.line.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const removeLine = (id: string) =>
    updateLoads(
      'line',
      inputs.loads.line.filter((l) => l.id !== id),
    );

  // Area load helpers
  const addArea = () =>
    updateLoads('area', [
      ...inputs.loads.area,
      {
        id: crypto.randomUUID(),
        magnitude: 0,
        start: 0,
        end: inputs.span,
        category: 'G' satisfies LoadCategory,
      },
    ]);
  const updateArea = (id: string, patch: Partial<AreaLoad>) =>
    updateLoads(
      'area',
      inputs.loads.area.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  const removeArea = (id: string) =>
    updateLoads(
      'area',
      inputs.loads.area.filter((a) => a.id !== id),
    );

  const span = inputs.span;
  const inputCls = 'border rounded px-2 py-1 text-sm w-full';
  const catBtn = (active: boolean) =>
    `flex-1 text-sm rounded px-2 py-1 border ${active ? 'bg-blue-500 text-white' : 'bg-white'}`;

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">2. Loads</h2>

      {/* Live Load Category — drives ψ_l in the G+ψ_l·Q deflection check */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Live Load Category (ψ_l factor)
        </label>
        <select
          className={inputCls}
          value={inputs.liveLoadType}
          onChange={(e) => onChange({ liveLoadType: e.target.value as LiveLoadType })}
        >
          {(Object.keys(LIVE_LOAD_LABELS) as LiveLoadType[]).map((k) => (
            <option key={k} value={k}>
              {LIVE_LOAD_LABELS[k]} (ψ_l = {PSI_L_FACTORS[k]})
            </option>
          ))}
        </select>
      </div>

      {/* Point Loads */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Point Loads (kN)</h3>
          <button
            onClick={addPoint}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1 mc-btn-primary"
          >
            + Add
          </button>
        </div>
        {inputs.loads.point.length === 0 && (
          <p className="text-xs text-gray-500">No point loads.</p>
        )}
        {inputs.loads.point.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
            <span className="col-span-3">Magnitude (kN)</span>
            <span className="col-span-3">Position (% span)</span>
            <span className="col-span-4">Category</span>
            <span className="col-span-2" />
          </div>
        )}
        {inputs.loads.point.map((p) => {
          const posInvalid = p.position < 0 || p.position > 100;
          return (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center mb-1">
              <input
                className={`${inputCls} col-span-3`}
                type="number"
                step={0.1}
                value={p.magnitude}
                onChange={(e) =>
                  updatePoint(p.id, { magnitude: parseFloat(e.target.value) || 0 })
                }
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  updatePoint(p.id, { magnitude: v });
                  e.target.value = String(v);
                }}
                placeholder="kN"
              />
              <div className="col-span-3">
                <input
                  className={inputCls}
                  type="number"
                  step={0.1}
                  value={p.position}
                  onChange={(e) =>
                    updatePoint(p.id, { position: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    updatePoint(p.id, { position: v });
                    e.target.value = String(v);
                  }}
                  placeholder="% of span"
                />
                {posInvalid && (
                  <p className="text-xs text-red-600 mt-0.5">Must be 0–100%</p>
                )}
              </div>
              <div className="col-span-4 flex gap-1">
                <button
                  onClick={() => updatePoint(p.id, { category: 'G' })}
                  className={catBtn(p.category === 'G')}
                >
                  G
                </button>
                <button
                  onClick={() => updatePoint(p.id, { category: 'Q' })}
                  className={catBtn(p.category === 'Q')}
                >
                  Q
                </button>
              </div>
              <button
                onClick={() => removePoint(p.id)}
                className="col-span-2 text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Line Loads */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Line Loads / UDL (kN/m)</h3>
          <button
            onClick={addLine}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1 mc-btn-primary"
          >
            + Add
          </button>
        </div>
        {inputs.loads.line.length === 0 && (
          <p className="text-xs text-gray-500">No line loads.</p>
        )}
        {inputs.loads.line.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
            <span className="col-span-2">Mag. (kN/m)</span>
            <span className="col-span-2">Start (m)</span>
            <span className="col-span-2">End (m)</span>
            <span className="col-span-4">Category</span>
            <span className="col-span-2" />
          </div>
        )}
        {inputs.loads.line.map((l) => {
          const rangeInvalid =
            l.start < 0 || l.end > span || l.start >= l.end;
          return (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-center mb-1">
              <input
                className={`${inputCls} col-span-2`}
                type="number"
                step={0.1}
                value={l.magnitude}
                onChange={(e) =>
                  updateLine(l.id, { magnitude: parseFloat(e.target.value) || 0 })
                }
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  updateLine(l.id, { magnitude: v });
                  e.target.value = String(v);
                }}
                placeholder="kN/m"
              />
              <input
                className={`${inputCls} col-span-2`}
                type="number"
                step={0.1}
                value={l.start}
                onChange={(e) =>
                  updateLine(l.id, { start: parseFloat(e.target.value) || 0 })
                }
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  updateLine(l.id, { start: v });
                  e.target.value = String(v);
                }}
                placeholder="start (m)"
              />
              <div className="col-span-2">
                <input
                  className={inputCls}
                  type="number"
                  step={0.1}
                  value={l.end}
                  onChange={(e) =>
                    updateLine(l.id, { end: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    updateLine(l.id, { end: v });
                    e.target.value = String(v);
                  }}
                  placeholder="end (m)"
                />
                {rangeInvalid && (
                  <p className="text-xs text-red-600 mt-0.5">Invalid range</p>
                )}
              </div>
              <div className="col-span-4 flex gap-1">
                <button
                  onClick={() => updateLine(l.id, { category: 'G' })}
                  className={catBtn(l.category === 'G')}
                >
                  G
                </button>
                <button
                  onClick={() => updateLine(l.id, { category: 'Q' })}
                  className={catBtn(l.category === 'Q')}
                >
                  Q
                </button>
              </div>
              <button
                onClick={() => removeLine(l.id)}
                className="col-span-2 text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          );
        })}

        <div className="bg-gray-100 rounded p-2 text-sm mt-2">
          Self-weight (auto, G): {calcSelfWeightKnPerM(inputs.section).toFixed(3)} kN/m over full span
        </div>
      </div>

      {/* Area Loads */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Area Loads (kPa)</h3>
          <button
            onClick={addArea}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1 mc-btn-primary"
          >
            + Add
          </button>
        </div>
        {inputs.loads.area.length === 0 && (
          <p className="text-xs text-gray-500">No area loads.</p>
        )}
        {inputs.loads.area.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 font-medium">
            <span className="col-span-2">Mag. (kPa)</span>
            <span className="col-span-2">Start (m)</span>
            <span className="col-span-2">End (m)</span>
            <span className="col-span-4">Category</span>
            <span className="col-span-2" />
          </div>
        )}
        {inputs.loads.area.map((a) => {
          const rangeInvalid =
            a.start < 0 || a.end > span || a.start >= a.end;
          return (
            <div key={a.id} className="grid grid-cols-12 gap-2 items-center mb-1">
              <input
                className={`${inputCls} col-span-2`}
                type="number"
                step={0.1}
                value={a.magnitude}
                onChange={(e) =>
                  updateArea(a.id, { magnitude: parseFloat(e.target.value) || 0 })
                }
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  updateArea(a.id, { magnitude: v });
                  e.target.value = String(v);
                }}
                placeholder="kPa"
              />
              <input
                className={`${inputCls} col-span-2`}
                type="number"
                step={0.1}
                value={a.start}
                onChange={(e) =>
                  updateArea(a.id, { start: parseFloat(e.target.value) || 0 })
                }
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  updateArea(a.id, { start: v });
                  e.target.value = String(v);
                }}
                placeholder="start (m)"
              />
              <div className="col-span-2">
                <input
                  className={inputCls}
                  type="number"
                  step={0.1}
                  value={a.end}
                  onChange={(e) =>
                    updateArea(a.id, { end: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    updateArea(a.id, { end: v });
                    e.target.value = String(v);
                  }}
                  placeholder="end (m)"
                />
                {rangeInvalid && (
                  <p className="text-xs text-red-600 mt-0.5">Invalid range</p>
                )}
              </div>
              <div className="col-span-4 flex gap-1">
                <button
                  onClick={() => updateArea(a.id, { category: 'G' })}
                  className={catBtn(a.category === 'G')}
                >
                  G
                </button>
                <button
                  onClick={() => updateArea(a.id, { category: 'Q' })}
                  className={catBtn(a.category === 'Q')}
                >
                  Q
                </button>
              </div>
              <button
                onClick={() => removeArea(a.id)}
                className="col-span-2 text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          );
        })}
        {inputs.loads.area.length > 0 && (
          <p className="text-xs text-gray-600 italic mt-1">
            Converted to line load via tributary width = {inputs.tributaryWidth} m.
          </p>
        )}
      </div>

      {/* Axial compression (beam-column) — AS4100 Cl. 8.4 */}
      <div className="border-t pt-3 mt-2">
        <h3 className="font-medium mb-2">Axial Compression</h3>
        <div className="grid grid-cols-12 gap-2 items-center">
          <label className="col-span-7 text-sm">
            Axial Compression (kN)
            <input
              className={inputCls}
              type="number"
              step={1}
              value={inputs.axialCompression?.magnitude ?? ''}
              placeholder="0"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange({
                  axialCompression:
                    isNaN(val) || val === 0
                      ? null
                      : { magnitude: val, category: inputs.axialCompression?.category ?? 'G' },
                });
              }}
            />
          </label>
          <label className="col-span-5 text-sm">
            Category
            <select
              className={inputCls}
              value={inputs.axialCompression?.category ?? 'G'}
              disabled={!inputs.axialCompression}
              onChange={(e) =>
                onChange({
                  axialCompression: inputs.axialCompression
                    ? { ...inputs.axialCompression, category: e.target.value as LoadCategory }
                    : null,
                })
              }
            >
              <option value="G">G</option>
              <option value="Q">Q</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
