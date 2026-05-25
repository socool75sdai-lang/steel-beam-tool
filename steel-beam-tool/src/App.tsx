import { useState, useEffect } from 'react';
import type { DesignInputs, DeflLimits } from '@/types';
import { getDefaultSection } from '@/engineering/sections/sectionUtils';
import { useDesignCalculations } from '@/hooks/useDesignCalculations';
import { GeometryPanel } from '@/components/GeometryPanel';
import { LoadPanel } from '@/components/LoadPanel';
import { RestraintPanel } from '@/components/RestraintPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function initialInputs(): DesignInputs {
  return {
    span: 6,
    tributaryWidth: 3,
    section: getDefaultSection(),
    loads: { point: [], line: [], area: [] },
    restraint: {
      mode: 'simple',
      simpleType: 'FF',
      leMultiplier: 1.0,
      endA: 'F',
      endB: 'F',
      intermediate: [],
      alphaMOverride: null,
    },
    deflLimits: { GQ: 300, G: 360 },
  };
}

export default function App() {
  const [inputs, setInputs] = useState<DesignInputs>(initialInputs);
  const [theme, setTheme] = useState<'mcveigh' | 'light'>(
    () => (localStorage.getItem('mc-theme') as 'mcveigh' | 'light' | null) ?? 'mcveigh',
  );
  const { results, diagrams } = useDesignCalculations(inputs);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mc-theme', theme);
  }, [theme]);

  const handleChange = (patch: Partial<DesignInputs>) =>
    setInputs(prev => ({ ...prev, ...patch }));

  const handleDeflLimits = (deflLimits: DeflLimits) =>
    setInputs(prev => ({ ...prev, deflLimits }));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header
        style={{ backgroundColor: 'var(--mc-green-dark)' }}
        className="w-full px-6 py-3 flex items-center justify-between"
      >
        <h1 style={{ color: 'var(--mc-gold)' }} className="text-lg font-bold tracking-wide">
          Steel Beam Design Tool
        </h1>

        <div className="flex items-center gap-4">
          {/* SVG placeholder wordmark — swap for /logo.svg later */}
          <svg width="160" height="32" viewBox="0 0 160 32" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="22" fontFamily="serif" fontSize="14" fontWeight="bold" fill="#C4A962">
              McVeigh Consultants
            </text>
          </svg>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'mcveigh' | 'light')}
            style={{ backgroundColor: 'var(--mc-green-mid)', color: 'var(--mc-gold)', border: '1px solid var(--mc-gold)' }}
            className="text-sm rounded px-2 py-1"
          >
            <option value="mcveigh">McVeigh</option>
            <option value="light">Light</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-gray-50">
        <div className="w-2/5 overflow-y-auto p-4 border-r border-gray-300">
          <GeometryPanel inputs={inputs} onChange={handleChange} />
          <LoadPanel inputs={inputs} onChange={handleChange} />
          <RestraintPanel inputs={inputs} onChange={handleChange} />
        </div>
        <div className="w-3/5 overflow-y-auto">
          <ErrorBoundary>
            <ResultsPanel
              inputs={inputs}
              results={results}
              diagrams={diagrams}
              onDeflLimitsChange={handleDeflLimits}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
