import { useState, useEffect, useRef } from 'react';
import type { DesignInputs, DeflLimits } from '@/types';
import { getDefaultSection } from '@/engineering/sections/sectionUtils';
import { useDesignCalculations } from '@/hooks/useDesignCalculations';
import { GeometryPanel } from '@/components/GeometryPanel';
import { LoadPanel } from '@/components/LoadPanel';
import { RestraintPanel } from '@/components/RestraintPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { buildFilename } from '@/utils/pdfExport';

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
    liveLoadType: 'office',
    steelGrade: 'G300',
  };
}

export default function App() {
  const [inputs, setInputs] = useState<DesignInputs>(initialInputs);
  const [jobNumber, setJobNumber] = useState('');
  const [jobName, setJobName] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<'mcveigh' | 'light'>(
    () => (localStorage.getItem('mc-theme') as 'mcveigh' | 'light' | null) ?? 'mcveigh',
  );
  const { results, diagrams } = useDesignCalculations(inputs);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mc-theme', theme);
  }, [theme]);

  const handleChange = (patch: Partial<DesignInputs>) =>
    setInputs(prev => {
      const next = { ...prev, ...patch };
      if (patch.span !== undefined) {
        next.loads = {
          ...next.loads,
          line: next.loads.line.map(l => ({ ...l, end: patch.span! })),
          area: next.loads.area.map(a => ({ ...a, end: patch.span! })),
        };
      }
      return next;
    });

  const handleDeflLimits = (deflLimits: DeflLimits) =>
    setInputs(prev => ({ ...prev, deflLimits }));

  const handleExport = () => {
    const payload = { jobNumber, jobName, inputs };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(jobNumber, jobName, 'json');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const { jobNumber: jn, jobName: jnm, inputs: imp } = JSON.parse(text);
        if (!imp) throw new Error('missing inputs');
        setJobNumber(jn ?? '');
        setJobName(jnm ?? '');
        setInputs(imp as DesignInputs);
        setImportMsg(`Loaded: ${file.name}`);
      } catch {
        setImportMsg('Invalid file — could not load.');
      }
    });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header
        style={{ backgroundColor: 'var(--mc-green-dark)' }}
        className="w-full px-6 py-3 flex items-center justify-between"
      >
        <h1 style={{ color: 'var(--mc-gold)' }} className="text-lg font-bold tracking-wide">
          McVeigh Steel Designer
        </h1>

        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="McVeigh Consultants" className="h-10 w-auto" />

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

      <nav
        style={{ backgroundColor: 'var(--mc-green-mid)', borderBottom: '2px solid var(--mc-gold)' }}
        className="px-4 flex"
      >
        <button
          style={{ color: 'var(--mc-gold)', borderBottom: '2px solid var(--mc-gold)' }}
          className="px-4 py-2 text-sm font-medium -mb-px"
        >
          Steel Beam
        </button>
      </nav>

      <div
        style={{ backgroundColor: 'var(--mc-green-mid)', borderBottom: '1px solid var(--mc-gold)' }}
        className="px-4 py-2"
      >
        <div className="flex gap-4 items-center">
          <label className="text-sm mc-label flex items-center gap-2">
            Job No:
            <input
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="e.g. J001"
              className="border border-gray-300 rounded px-2 py-1 w-32"
            />
          </label>
          <label className="text-sm mc-label flex items-center gap-2 flex-1">
            Job Name:
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Town Hall"
              className="border border-gray-300 rounded px-2 py-1 flex-1"
            />
          </label>
        </div>
        <div className="flex gap-2 items-center mt-2">
          <button
            onClick={handleImport}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1 mc-btn-primary"
          >
            ↑ Import
          </button>
          <button
            onClick={handleExport}
            className="bg-blue-500 text-white text-sm rounded px-3 py-1 mc-btn-primary"
          >
            ↓ Export
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {importMsg && <span className="text-sm mc-label">{importMsg}</span>}
        </div>
      </div>

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
              jobNumber={jobNumber}
              jobName={jobName}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
