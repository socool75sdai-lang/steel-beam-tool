import { useState } from 'react';
import type { BraceInputs } from '@/types/brace';
import { getSectionsByType } from '@/engineering/sections/sectionUtils';
import { useBraceCalculations } from '@/hooks/useBraceCalculations';
import { BraceGeometryPanel } from '@/components/BraceGeometryPanel';
import { BraceLoadPanel } from '@/components/BraceLoadPanel';
import { BraceResultsPanel } from '@/components/BraceResultsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface BraceAppProps {
  className?: string;
  jobNumber?: string;
  jobName?: string;
}

function initialBraceInputs(): BraceInputs {
  return {
    span: 4,
    sectionType: 'CHS',
    steelGrade: 'C350',
    section: getSectionsByType('CHS')[0],
    kx: 1.0,
    ky: 1.0,
    nStar: 0,
    pointLoads: [],
    liveLoadType: 'office',
    deflLimit: 360,
  };
}

export default function BraceApp({ className, jobNumber, jobName }: BraceAppProps) {
  const [inputs, setInputs] = useState<BraceInputs>(initialBraceInputs);
  const results = useBraceCalculations(inputs);

  const handleChange = (patch: Partial<BraceInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className={className}>
      <div className="w-2/5 overflow-y-auto p-4 border-r border-gray-300">
        <BraceGeometryPanel inputs={inputs} onChange={handleChange} />
        <BraceLoadPanel inputs={inputs} results={results} onChange={handleChange} />
      </div>
      <div className="w-3/5 overflow-y-auto">
        <ErrorBoundary>
          <BraceResultsPanel inputs={inputs} results={results} jobNumber={jobNumber} jobName={jobName} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
