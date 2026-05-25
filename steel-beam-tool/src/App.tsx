import { useState } from 'react';
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
  const { results, diagrams } = useDesignCalculations(inputs);

  const handleChange = (patch: Partial<DesignInputs>) =>
    setInputs(prev => ({ ...prev, ...patch }));

  const handleDeflLimits = (deflLimits: DeflLimits) =>
    setInputs(prev => ({ ...prev, deflLimits }));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-2/5 overflow-y-auto p-4 border-r border-gray-300">
        <h1 className="text-xl font-bold mb-4">Steel Beam Design Tool</h1>
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
  );
}
