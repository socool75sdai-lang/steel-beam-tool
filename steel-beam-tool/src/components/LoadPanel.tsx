import type { DesignInputs, PointLoad, LineLoad, AreaLoad, LoadCategory } from '@/types';
import { calcSelfWeightKnPerM } from '@/engineering/sections/sectionUtils';

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
    <section className="border rounded p-4 mb-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">2. Loads</h2>

      {/* Point Loads */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Point Loads (kN)</h3>
          <button
            onClick={addPoint}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1"
          >
            + Add
          </button>
        </div>
        {inputs.loads.point.length === 0 && (
          <p className="text-xs text-gray-500">No point loads.</p>
        )}
        {inputs.loads.point.map((p) => {
          const posInvalid = p.position < 0 || p.position > span;
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
                  placeholder="position (m)"
                />
                {posInvalid && (
                  <p className="text-xs text-red-600 mt-0.5">Out of span</p>
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
            className="bg-blue-500 text-white text-sm rounded px-3 py-1"
          >
            + Add
          </button>
        </div>
        {inputs.loads.line.length === 0 && (
          <p className="text-xs text-gray-500">No line loads.</p>
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
            className="bg-blue-500 text-white text-sm rounded px-3 py-1"
          >
            + Add
          </button>
        </div>
        {inputs.loads.area.length === 0 && (
          <p className="text-xs text-gray-500">No area loads.</p>
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
    </section>
  );
}
