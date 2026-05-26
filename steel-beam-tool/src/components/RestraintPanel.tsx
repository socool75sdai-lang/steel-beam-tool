import { useState, useEffect } from 'react';
import type { DesignInputs, SimpleRestraint, EndRestraint, RestraintMode } from '@/types';

interface RestraintPanelProps {
  inputs: DesignInputs;
  onChange: (patch: Partial<DesignInputs>) => void;
}

const simpleOptions: { value: SimpleRestraint; label: string }[] = [
  { value: 'FF', label: 'FF — Both ends fully restrained (Le/L = 1.0)' },
  { value: 'PP', label: 'PP — Pin-pin (Le/L = 1.0)' },
  { value: 'PF', label: 'PF — Pin-fixed (Le/L = 1.2)' },
  { value: 'FC', label: 'FC — Cantilever (Le/L = 0.7)' },
  { value: 'custom', label: 'Custom Le/L multiplier' },
];

const endOptions: { value: EndRestraint; label: string }[] = [
  { value: 'F', label: 'F — Fully restrained' },
  { value: 'P', label: 'P — Partially restrained' },
  { value: 'L', label: 'L — Laterally restrained' },
  { value: 'U', label: 'U — Unrestrained' },
];

export function RestraintPanel({ inputs, onChange }: RestraintPanelProps) {
  const r = inputs.restraint;

  const updateRestraint = (patch: Partial<typeof r>) => {
    onChange({ restraint: { ...r, ...patch } });
  };

  const [intermediateCount, setIntermediateCount] = useState(0);

  const computedPositions = Array.from({ length: intermediateCount }, (_, i) =>
    parseFloat(((inputs.span / (intermediateCount + 1)) * (i + 1)).toFixed(3)),
  );

  useEffect(() => {
    updateRestraint({ intermediate: computedPositions });
  }, [intermediateCount, inputs.span]);

  return (
    <section className="border rounded p-4 mb-4 bg-white shadow-sm mc-panel">
      <h2 className="text-lg font-semibold mb-3 mc-heading">3. Restraints</h2>

      <div className="flex gap-2 mb-3">
        {(['simple', 'advanced'] as RestraintMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => updateRestraint({ mode })}
            className={`flex-1 rounded px-3 py-1 border ${
              r.mode === mode ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            {mode === 'simple' ? 'Simple' : 'Advanced'}
          </button>
        ))}
      </div>

      {r.mode === 'simple' && (
        <div>
          <div className="space-y-1">
            {simpleOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="simpleType"
                  checked={r.simpleType === opt.value}
                  onChange={() => updateRestraint({ simpleType: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {r.simpleType === 'custom' && (
            <div className="mt-2">
              <label className="text-sm">
                Le/L multiplier
                <input
                  type="number"
                  step={0.05}
                  value={r.leMultiplier}
                  onChange={(e) =>
                    updateRestraint({ leMultiplier: parseFloat(e.target.value) || 1 })
                  }
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 1;
                    updateRestraint({ leMultiplier: v });
                    e.target.value = String(v);
                  }}
                  className="ml-2 w-24 border rounded px-2 py-1"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {r.mode === 'advanced' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              End A
              <select
                value={r.endA}
                onChange={(e) =>
                  updateRestraint({ endA: e.target.value as EndRestraint })
                }
                className="w-full mt-1 border rounded px-2 py-1 mc-select"
              >
                {endOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              End B
              <select
                value={r.endB}
                onChange={(e) =>
                  updateRestraint({ endB: e.target.value as EndRestraint })
                }
                className="w-full mt-1 border rounded px-2 py-1 mc-select"
              >
                {endOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3">
            <label className="text-sm font-medium">Number of intermediate restraints</label>
            <input
              type="number"
              min={0}
              step={1}
              value={intermediateCount}
              onChange={(e) => setIntermediateCount(Math.max(0, parseInt(e.target.value) || 0))}
              onBlur={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                setIntermediateCount(v);
                e.target.value = String(v);
              }}
              className="mt-1 w-24 border rounded px-2 py-1"
            />
            {intermediateCount > 0 && (
              <p className="text-xs mt-1 text-gray-500">
                Positions: {computedPositions.map((p) => `${p.toFixed(2)} m`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={r.alphaMOverride !== null}
            onChange={(e) =>
              updateRestraint({ alphaMOverride: e.target.checked ? 1.0 : null })
            }
          />
          Override αm (moment modification factor)
        </label>
        {r.alphaMOverride !== null && (
          <input
            type="number"
            step={0.05}
            value={r.alphaMOverride}
            onChange={(e) =>
              updateRestraint({ alphaMOverride: parseFloat(e.target.value) || 1.0 })
            }
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 1.0;
              updateRestraint({ alphaMOverride: v });
              e.target.value = String(v);
            }}
            className="mt-2 w-24 border rounded px-2 py-1"
          />
        )}
      </div>
    </section>
  );
}
