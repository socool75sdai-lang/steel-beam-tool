import { useState } from 'react';
import type { ColumnInputs } from '@/types/column';
import { getSectionsByType } from '@/engineering/sections/sectionUtils';
import { useColumnCalculations } from '@/hooks/useColumnCalculations';
import { ColumnGeometryPanel } from '@/components/ColumnGeometryPanel';
import { ColumnLoadPanel } from '@/components/ColumnLoadPanel';
import { ColumnResultsPanel } from '@/components/ColumnResultsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ColumnAppProps {
  className?: string;
  jobNumber?: string;
  jobName?: string;
}

function initialColumnInputs(): ColumnInputs {
  return {
    height: 4,
    sectionType: 'UC',
    steelGrade: 'G300',
    section: getSectionsByType('UC')[0],
    kx: 1.0,
    ky: 1.0,
    G: 0,
    Q: 0,
    ex: 0,
    ey: 0,
  };
}

export default function ColumnApp({ className, jobNumber, jobName }: ColumnAppProps) {
  const [inputs, setInputs] = useState<ColumnInputs>(initialColumnInputs);
  const results = useColumnCalculations(inputs);

  const handleChange = (patch: Partial<ColumnInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className={className}>
      <div className="w-2/5 overflow-y-auto p-4 border-r border-gray-300">
        <ColumnGeometryPanel inputs={inputs} onChange={handleChange} />
        <ColumnLoadPanel inputs={inputs} results={results} onChange={handleChange} />
      </div>
      <div className="w-3/5 overflow-y-auto">
        <ErrorBoundary>
          <ColumnResultsPanel inputs={inputs} results={results} jobNumber={jobNumber} jobName={jobName} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
