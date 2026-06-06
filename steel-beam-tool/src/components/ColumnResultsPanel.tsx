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
} from 'recharts';
import type { ColumnInputs, ColumnResults } from '@/types/column';
import { exportColumnToPDF } from '@/utils/columnPdfExport';

interface ColumnResultsPanelProps {
  inputs: ColumnInputs;
  results: ColumnResults;
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

export function ColumnResultsPanel({ inputs, results, jobNumber, jobName }: ColumnResultsPanelProps) {
  const im = results.intermediates;
  const [showCalc, setShowCalc] = useState(false);
  const s = inputs.section;

  const handleExport = () => {
    try {
      exportColumnToPDF(inputs, results, jobNumber, jobName);
    } catch (err) {
      console.error('Column PDF export failed:', err);
      alert('PDF export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };
  const hasMx = results.mStarX > 0;
  const hasMy = results.mStarY > 0;

  // Governing axis for the interaction diagram (x if M*x >= M*y, else y)
  const govX = results.mStarX >= results.mStarY;
  const mStarGov = govX ? results.mStarX : results.mStarY;
  const phiMsGov = govX ? results.phiMsx : results.phiMsy;
  const phiMbGov = govX ? results.phiMbx : results.phiMby;
  const govLabel = govX ? 'N*-M*x' : 'N*-M*y';

  const sectionInside = results.nStar / results.phiNs + mStarGov / phiMsGov <= 1;
  const memberInside = results.nStar / results.phiNc + mStarGov / phiMbGov <= 1;
  const sectionColor = sectionInside ? '#16a34a' : '#dc2626';
  const memberColor = memberInside ? '#16a34a' : '#dc2626';

  const sectionEnvelope = [
    { x: 0, y: results.phiNs },
    { x: phiMsGov, y: 0 },
  ];
  const memberEnvelope = [
    { x: 0, y: results.phiNc },
    { x: phiMbGov, y: 0 },
  ];
  const designPoint = [{ x: mStarGov, y: results.nStar }];

  return (
    <section className="p-4 mc-panel">
      <h2 className="text-xl font-bold mb-3 mc-heading">Column Design Results</h2>

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
            <td className="p-2 border">Axial — Section (&phi;Ns)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNs.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNs)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialSection)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Axial — Member x (&phi;Nc_x)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNcX.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNcX)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialMemberX)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Axial — Member y (&phi;Nc_y)</td>
            <td className="text-right p-2 border">{results.nStar.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{results.phiNcY.toFixed(1)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.utilNcY)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.axialMemberY)}</td>
          </tr>
          {hasMx && (
            <tr>
              <td className="p-2 border">Bending x — Section (&phi;Msx)</td>
              <td className="text-right p-2 border">{results.mStarX.toFixed(2)} kN&middot;m</td>
              <td className="text-right p-2 border">{results.phiMsx.toFixed(2)} kN&middot;m</td>
              <td className="text-right p-2 border">{utilCell(results.utilMsx)}</td>
              <td className="text-center p-2 border">{statusCell(results.passes.bendingX)}</td>
            </tr>
          )}
          {hasMy && (
            <tr>
              <td className="p-2 border">Bending y — Section (&phi;Msy)</td>
              <td className="text-right p-2 border">{results.mStarY.toFixed(2)} kN&middot;m</td>
              <td className="text-right p-2 border">{results.phiMsy.toFixed(2)} kN&middot;m</td>
              <td className="text-right p-2 border">{utilCell(results.utilMsy)}</td>
              <td className="text-center p-2 border">{statusCell(results.passes.bendingY)}</td>
            </tr>
          )}
          <tr>
            <td className="p-2 border">Combined — Section (Cl. 8.3.3)</td>
            <td className="text-right p-2 border">{results.ratioSection.toFixed(3)}</td>
            <td className="text-right p-2 border">&le; 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioSection)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedSection)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Combined — Member in-plane (Cl. 8.4.2)</td>
            <td className="text-right p-2 border">{results.ratioMemberInplane.toFixed(3)}</td>
            <td className="text-right p-2 border">&le; 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioMemberInplane)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedMemberInplane)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Combined — Member out-of-plane (Cl. 8.4.4)</td>
            <td className="text-right p-2 border">{results.ratioMemberOutofplane.toFixed(3)}</td>
            <td className="text-right p-2 border">&le; 1.00</td>
            <td className="text-right p-2 border">{utilCell(results.ratioMemberOutofplane)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.combinedMemberOutofplane)}</td>
          </tr>
        </tbody>
      </table>

      <p className="text-xs mc-subtle mb-4">
        Section class: {im.sectionClass} &middot; fy = {im.fy} MPa &middot; Le_x = {im.LeX.toFixed(2)} m
        &middot; Le_y = {im.LeY.toFixed(2)} m
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
            <p className="font-bold mb-1">1. STEEL GRADE &amp; fy [AS3678 / AS1163]</p>
            <p>fy = {im.fy.toFixed(0)} MPa</p>
            <p className="italic text-gray-500">
              {im.isHollow
                ? 'Hollow section — AS1163 flat fy (independent of thickness).'
                : 'UC section — AS3678 thickness-dependent fy.'}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">2. SECTION CLASSIFICATION [AS4100 Cl. 5.2.2]</p>
            <p>Section class: {im.sectionClass}</p>
            <p>Ze_x = {im.ZeX.toExponential(3)} mm³ · Ze_y = {im.ZeY.toExponential(3)} mm³</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">3. BENDING SECTION CAPACITY [AS4100 Cl. 5.2.1]</p>
            <p>φMsx = 0.9 × Ze_x × fy / 1e6 = {results.phiMsx.toFixed(2)} kN·m</p>
            <p>φMsy = 0.9 × Ze_y × fy / 1e6 = {results.phiMsy.toFixed(2)} kN·m</p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">4. LATERAL-TORSIONAL BUCKLING [AS4100 Cl. 5.6]</p>
            {im.isHollow ? (
              <p>No LTB — closed section. φMbx = φMsx = {results.phiMbx.toFixed(2)} kN·m</p>
            ) : (
              <>
                <p>LTB effective length Le_x = {im.LeX.toFixed(2)} m (αm = 1.0, conservative)</p>
                <p>φMbx = {results.phiMbx.toFixed(2)} kN·m</p>
                <p>φMby = φMsy = {results.phiMby.toFixed(2)} kN·m (no LTB about weak axis)</p>
              </>
            )}
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">5. FACTORED LOADS [AS1170.1]</p>
            <p>
              N* = max(1.2G + 1.5Q, G) = max({(1.2 * inputs.G + 1.5 * inputs.Q).toFixed(1)},{' '}
              {inputs.G.toFixed(1)}) = {results.nStar.toFixed(1)} kN
            </p>
            <p>
              M*x = N* × e_y / 1000 = {results.nStar.toFixed(1)} × {inputs.ey.toFixed(0)} / 1000 ={' '}
              {results.mStarX.toFixed(2)} kN·m
            </p>
            <p>
              M*y = N* × e_x / 1000 = {results.nStar.toFixed(1)} × {inputs.ex.toFixed(0)} / 1000 ={' '}
              {results.mStarY.toFixed(2)} kN·m
            </p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">6. AXIAL SECTION CAPACITY [AS4100 Cl. 6.2]</p>
            <p>kf = {im.kf.toFixed(2)} (Aeff = Ag)</p>
            <p>
              φNs = 0.9 × kf × Ag × fy / 1000 = 0.9 × {im.kf.toFixed(2)} × {s.Ag.toFixed(0)} ×{' '}
              {im.fy.toFixed(0)} / 1000 = {results.phiNs.toFixed(1)} kN [{(results.utilNs * 100).toFixed(1)}%]
            </p>
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">7. AXIAL MEMBER CAPACITY [AS4100 Cl. 6.3.3]</p>
            <p>r_x = {im.rX.toFixed(1)} mm · r_y = {im.rY.toFixed(1)} mm</p>
            <p>
              λn_x = (Le_x / r_x) × √(kf·fy/250) = {im.lambdaNX.toFixed(1)}; α_c_x ={' '}
              {im.alphaCX.toFixed(3)} → φNc_x = {results.phiNcX.toFixed(1)} kN [
              {(results.utilNcX * 100).toFixed(1)}%]
            </p>
            <p>
              λn_y = (Le_y / r_y) × √(kf·fy/250) = {im.lambdaNY.toFixed(1)}; α_c_y ={' '}
              {im.alphaCY.toFixed(3)} → φNc_y = {results.phiNcY.toFixed(1)} kN [
              {(results.utilNcY * 100).toFixed(1)}%]
            </p>
            <p>φNc = min(φNc_x, φNc_y) = {results.phiNc.toFixed(1)} kN</p>
          </div>

          <div>
            <p className="font-bold mb-1">8. COMBINED ACTIONS [AS4100 Cl. 8.3 / 8.4]</p>
            <p>
              Section (Cl. 8.3.3): N*/φNs + M*x/φMsx + M*y/φMsy = {results.ratioSection.toFixed(3)} ≤ 1.0
              → {PF(results.passes.combinedSection)}
            </p>
            <p>
              Member in-plane (Cl. 8.4.2): N*/φNc + M*x/φMsx = {results.ratioMemberInplane.toFixed(3)} ≤
              1.0 → {PF(results.passes.combinedMemberInplane)}
            </p>
            <p>
              Member out-of-plane (Cl. 8.4.4): N*/φNc + M*x/φMbx ={' '}
              {results.ratioMemberOutofplane.toFixed(3)} ≤ 1.0 → {PF(results.passes.combinedMemberOutofplane)}
            </p>
            <p>Overall: {PF(results.passes.overall)}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-3 border rounded mb-4">
        <h3 className="text-sm font-semibold mb-1">
          {govLabel} Interaction (AS4100 Cl. 8.3/8.4)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart margin={{ top: 10, right: 25, left: 5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              label={{ value: 'M* (kN.m)', position: 'insideBottom', offset: -5 }}
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
              stroke={sectionColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              data={memberEnvelope}
              dataKey="y"
              name="Member envelope"
              stroke={memberColor}
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
