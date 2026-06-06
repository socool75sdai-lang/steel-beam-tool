import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BraceInputs, BraceResults } from '@/types/brace';
import { exportBraceToPDF } from '@/utils/bracePdfExport';

interface BraceResultsPanelProps {
  inputs: BraceInputs;
  results: BraceResults;
  jobNumber?: string;
  jobName?: string;
}

function statusCell(pass: boolean) {
  return (
    <span className={pass ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

function utilCell(ratio: number) {
  const pct = ratio * 100;
  return <span className={pct > 100 ? 'text-red-600 font-bold' : ''}>{pct.toFixed(1)}%</span>;
}

const PF = (b: boolean) => (b ? 'PASS' : 'FAIL');

export function BraceResultsPanel({ inputs, results, jobNumber, jobName }: BraceResultsPanelProps) {
  const im = results.intermediates;
  const [showCalc, setShowCalc] = useState(false);

  const handleExport = () => {
    try {
      exportBraceToPDF(inputs, results, jobNumber, jobName);
    } catch (err) {
      console.error('Brace PDF export failed:', err);
      alert('PDF export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Interaction envelopes (major axis; M*y = 0)
  const sectionEnvelope = [
    { x: 0, y: results.phiNs },
    { x: results.phiMsx, y: 0 },
  ];
  const memberEnvelope = [
    { x: 0, y: results.phiNc },
    { x: results.phiMbx, y: 0 },
  ];
  const designPoint = [{ x: results.mStar, y: results.nStar }];
  const sectionInside = results.ratioSection <= 1;
  const memberInside = results.ratioMemberOutofplane <= 1;

  const bmdData = results.bmd.map((p) => ({ x: p.x, moment: p.moment }));
  const deflData = results.deflectionProfile.map((p) => ({ x: p.x, delta: p.delta }));

  return (
    <section className="p-4 mc-panel">
      <h2 className="text-xl font-bold mb-3 mc-heading">Brace Design Results</h2>

      <div
        className={`p-4 rounded mb-4 text-white text-2xl font-bold text-center
          ${results.passes.overall ? 'bg-green-500' : 'bg-red-500'}`}
      >
        {results.passes.overall ? 'PASS' : 'FAIL'} — {inputs.section.designation}
      </div>

      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-gray-100 mc-table-header">
            <th className="text-left p-2 border">Check</th>
            <th className="text-right p-2 border">Demand</th>
            <th className="text-right p-2 border">Capacity</th>
            <th className="text-right p-2 border">Util</th>
            <th className="text-center p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Axial — Section (φNs)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNs.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNs)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialSection)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Axial — Member x (φNc_x)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNcX.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNcX)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialMemberX)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Axial — Member y (φNc_y)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNcY.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNcY)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialMemberY)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Bending x — Section (φMsx)</td>
            <td className="text-right p-2 border">{results.mStar.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{results.phiMsx.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{utilCell(results.utilMsx)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.bending)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Combined — Section (Cl. 8.3.3)</td>
            <td className="text-right p-2 border">{results.ratioSection.toFixed(3)}</td>
            <td className="text-right p-2 border">≤ 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioSection)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedSection)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Combined — Member in-plane (Cl. 8.4.2)</td>
            <td className="text-right p-2 border">{results.ratioMemberInplane.toFixed(3)}</td>
            <td className="text-right p-2 border">≤ 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioMemberInplane)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedMemberInplane)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Combined — Member out-of-plane (Cl. 8.4.4)</td>
            <td className="text-right p-2 border">{results.ratioMemberOutofplane.toFixed(3)}</td>
            <td className="text-right p-2 border">≤ 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioMemberOutofplane)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedMemberOutofplane)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Self-weight deflection</td>
            <td className="text-right p-2 border">{results.deflection.toFixed(2)} mm</td>
            <td className="text-right p-2 border">{results.deflectionLimit.toFixed(2)} mm</td>
            <td className="text-right p-2 border">{utilCell(results.deflection / results.deflectionLimit)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.deflection)}</td>
          </tr>
        </tbody>
      </table>

      <p className="text-xs mc-subtle mb-4">
        Section class: {im.sectionClass} · fy = {im.fy} MPa · Le_x = {im.LeX.toFixed(2)} m · Le_y ={' '}
        {im.LeY.toFixed(2)} m · governing combo: {results.govCombo}
      </p>

      <button
        onClick={() => setShowCalc((v) => !v)}
        className="mb-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded px-3 py-1 text-sm mc-btn-primary"
      >
        {showCalc ? 'Hide calculations ▴' : 'Show calculations ▾'}
      </button>

      {showCalc && (
        <div className="mb-4 bg-white border rounded p-3 text-xs leading-5 font-mono whitespace-pre-wrap text-gray-800">
          <div className="mb-3">
            <p className="font-bold mb-1">1. SECTION CLASSIFICATION [AS4100 Cl. 5.2.2]</p>
            <p>fy = {im.fy.toFixed(0)} MPa (AS1163 flat — closed section)</p>
            <p>Section class: {im.sectionClass} · Ze_x = {im.ZeX.toExponential(3)} mm³</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">2. AXIAL MEMBER CAPACITY [AS4100 Cl. 6.3.3]</p>
            <p>
              φNs = 0.9 × kf × Ag × fy / 1000 = {results.phiNs.toFixed(1)} kN [
              {(results.utilNs * 100).toFixed(1)}%]
            </p>
            <p>
              λn_x = (Le_x/r_x)√(kf·fy/250) = {im.lambdaNX.toFixed(1)}; α_c_x = {im.alphaCX.toFixed(3)} →
              φNc_x = {results.phiNcX.toFixed(1)} kN [{(results.utilNcX * 100).toFixed(1)}%]
            </p>
            <p>
              λn_y = (Le_y/r_y)√(kf·fy/250) = {im.lambdaNY.toFixed(1)}; α_c_y = {im.alphaCY.toFixed(3)} →
              φNc_y = {results.phiNcY.toFixed(1)} kN [{(results.utilNcY * 100).toFixed(1)}%]
            </p>
            <p>φNc = min(φNc_x, φNc_y) = {results.phiNc.toFixed(1)} kN</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">3. BENDING CAPACITY [AS4100 Cl. 5]</p>
            <p>φMsx = 0.9 × Ze_x × fy / 1e6 = {results.phiMsx.toFixed(2)} kN·m</p>
            <p>φMbx = φMsx = {results.phiMbx.toFixed(2)} kN·m — no LTB (closed section)</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">4. BENDING ACTIONS [AS1170.0 Cl. 4.2.2]</p>
            <p>Self-weight UDL (G) = {im.selfWeightKnPerM.toFixed(3)} kN/m</p>
            <p>Combos: 1.2G+1.5Q · 1.2G+Wu+ψc·Q (ψc = {im.psiC}) · 0.9G+Wu</p>
            <p>Governing: {results.govCombo} → M* = {results.mStar.toFixed(2)} kN·m [{(results.utilMsx * 100).toFixed(1)}%]</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">5. COMBINED ACTIONS [AS4100 Cl. 8.3 / 8.4]</p>
            <p>
              Section (Cl. 8.3.3): N*/φNs + M*/φMsx = {results.ratioSection.toFixed(3)} ≤ 1.0 →{' '}
              {PF(results.passes.combinedSection)}
            </p>
            <p>
              Member in-plane (Cl. 8.4.2): N*/φNc + M*/φMsx = {results.ratioMemberInplane.toFixed(3)} ≤
              1.0 → {PF(results.passes.combinedMemberInplane)}
            </p>
            <p>
              Member out-of-plane (Cl. 8.4.4): N*/φNc + M*/φMbx ={' '}
              {results.ratioMemberOutofplane.toFixed(3)} ≤ 1.0 → {PF(results.passes.combinedMemberOutofplane)}
            </p>
          </div>

          <div>
            <p className="font-bold mb-1">6. SELF-WEIGHT DEFLECTION [AS4100 Cl. 1.5.3]</p>
            <p>
              δ = {results.deflection.toFixed(2)} mm ≤ L/{inputs.deflLimit} ={' '}
              {results.deflectionLimit.toFixed(2)} mm → {PF(results.passes.deflection)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-4 bg-white p-3 border rounded">
        <div>
          <h3 className="text-sm font-semibold mb-1">N–M Interaction (AS4100 Cl. 8.3/8.4)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart margin={{ top: 10, right: 25, left: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                label={{ value: 'M* (kN·m)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                label={{ value: 'N* (kN)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line
                data={sectionEnvelope}
                dataKey="y"
                name="Section envelope"
                stroke={sectionInside ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                data={memberEnvelope}
                dataKey="y"
                name="Member envelope"
                stroke={memberInside ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                data={designPoint}
                dataKey="y"
                name="Design point (M*, N*)"
                stroke="#1d4ed8"
                strokeWidth={0}
                dot={{ r: 6, fill: '#1d4ed8' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-1">Bending Moment Diagram — {results.govCombo} (kN·m)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={bmdData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }} />
              <YAxis reversed label={{ value: 'M (kN·m)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <ReferenceLine y={0} stroke="#000" />
              <Line type="monotone" dataKey="moment" stroke="#dc2626" name="M*" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-1">Self-weight Deflection Profile (mm)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={deflData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }} />
              <YAxis reversed label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <ReferenceLine
                y={results.deflectionLimit}
                ifOverflow="extendDomain"
                stroke={results.passes.deflection ? '#16a34a' : '#dc2626'}
                strokeDasharray="4 2"
                label={{ value: `L/${inputs.deflLimit}`, position: 'insideTopRight', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="delta" stroke="#2563eb" name="self-weight δ" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mc-btn-primary"
      >
        Export PDF Report
      </button>
    </section>
  );
}
