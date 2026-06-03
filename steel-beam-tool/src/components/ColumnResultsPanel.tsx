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

export function ColumnResultsPanel({ inputs, results, jobNumber, jobName }: ColumnResultsPanelProps) {
  const im = results.intermediates;

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

      <p className="text-xs text-gray-600 mb-4">
        Section class: {im.sectionClass} &middot; fy = {im.fy} MPa &middot; Le_x = {im.LeX.toFixed(2)} m
        &middot; Le_y = {im.LeY.toFixed(2)} m
      </p>

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
