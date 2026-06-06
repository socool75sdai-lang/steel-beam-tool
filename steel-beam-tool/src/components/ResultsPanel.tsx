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
import type { DesignInputs, CapacityResults, DiagramSet, DeflLimits } from '@/types';
import { exportToPDF } from '@/utils/pdfExport';
import { getPsiL } from '@/engineering/as1170/psiFactors';

interface ResultsPanelProps {
  inputs: DesignInputs;
  results: CapacityResults | null;
  diagrams: DiagramSet | null;
  onDeflLimitsChange: (limits: DeflLimits) => void;
  jobNumber: string;
  jobName: string;
}

function statusCell(pass: boolean) {
  return (
    <span className={pass ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

function utilCell(util: number) {
  const pct = util * 100;
  return <span className={pct > 100 ? 'text-red-600 font-bold' : ''}>{pct.toFixed(1)}%</span>;
}

export function ResultsPanel({ inputs, results, diagrams, onDeflLimitsChange, jobNumber, jobName }: ResultsPanelProps) {
  const [showCalc, setShowCalc] = useState(false);

  if (!results || !diagrams) {
    return (
      <section className="p-4 mc-panel">
        <h2 className="text-xl font-bold mb-3 mc-heading">Design Results</h2>
        <div className="p-4 bg-white border rounded shadow-sm">
          <p className="text-gray-600">Enter valid inputs to see results.</p>
        </div>
      </section>
    );
  }

  const psiL = getPsiL(inputs.liveLoadType);
  const deflLabel = `G+${psiL}Q`;

  // Expanded calculation working — all values read from results.intermediates
  const im = results.intermediates;
  const sec = inputs.section;
  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : '—');
  const classOf = (lam: number, ep: number, ey: number) =>
    lam <= ep ? 'compact' : lam <= ey ? 'noncompact' : 'slender';
  const ry = sec.Ag > 0 ? Math.sqrt(sec.Iy / sec.Ag) : 0; // mm
  const betaM = -1.0;
  const Lmax = ry * (80 + 50 * betaM) * Math.sqrt(250 / im.fy); // mm
  const segLen = results.Le; // mm
  const ltbRequired = segLen > Lmax;
  const moaKnm = Number.isFinite(im.Moa) ? im.Moa / 1e6 : Infinity;

  const chartData = diagrams.factored.map((pt, i) => ({
    x: pt.x,
    factoredM: pt.moment,
    servicM: diagrams.serviceability[i]?.moment ?? 0,
    factoredV: pt.shear,
    servicV: diagrams.serviceability[i]?.shear ?? 0,
  }));

  const deflData = diagrams.deflectionGpsiLQ.map((pt, i) => ({
    x: pt.x,
    deltaGpsiLQ: pt.delta,
    deltaG: diagrams.deflectionG[i]?.delta ?? 0,
  }));

  const handleExport = async () => {
    try {
      await exportToPDF({
        inputs,
        results,
        bmd: diagrams.factored,
        sfd: diagrams.factored,
        deflectionGpsiLQ: diagrams.deflectionGpsiLQ,
        deflectionG: diagrams.deflectionG,
        jobNumber,
        jobName,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <section className="p-4 mc-panel">
      <h2 className="text-xl font-bold mb-3 mc-heading">Design Results</h2>

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
            <td className="p-2 border">Section moment (φMs)</td>
            <td className="text-right p-2 border">{results.Mmax.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{results.phiMs.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{utilCell(results.Mmax / results.phiMs)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.sectionMoment)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Member moment (φMbx)</td>
            <td className="text-right p-2 border">{results.Mmax.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{results.phiMbx.toFixed(2)} kN·m</td>
            <td className="text-right p-2 border">{utilCell(results.Mmax / results.phiMbx)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.memberMoment)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Shear (φVv)</td>
            <td className="text-right p-2 border">{results.Vmax.toFixed(2)} kN</td>
            <td className="text-right p-2 border">{results.phiVv.toFixed(2)} kN</td>
            <td className="text-right p-2 border">{utilCell(results.Vmax / results.phiVv)}</td>
            <td className="text-center p-2 border">{statusCell(results.passes.shear)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Deflection ({deflLabel})</td>
            <td className="text-right p-2 border">{results.deflectionGpsiLQ.toFixed(2)} mm</td>
            <td className="text-right p-2 border">{results.deflectionLimitGpsiLQ.toFixed(2)} mm</td>
            <td className="text-right p-2 border">
              {utilCell(results.deflectionGpsiLQ / results.deflectionLimitGpsiLQ)}
            </td>
            <td className="text-center p-2 border">{statusCell(results.passes.deflectionGpsiLQ)}</td>
          </tr>
          <tr>
            <td className="p-2 border">Deflection (G)</td>
            <td className="text-right p-2 border">{results.deflectionG.toFixed(2)} mm</td>
            <td className="text-right p-2 border">{results.deflectionLimitG.toFixed(2)} mm</td>
            <td className="text-right p-2 border">
              {utilCell(results.deflectionG / results.deflectionLimitG)}
            </td>
            <td className="text-center p-2 border">{statusCell(results.passes.deflectionG)}</td>
          </tr>
          {results.intermediates.nStar > 0 && (
            <>
              <tr>
                <td className="p-2 border">Combined — Section (N*/φNs + M*/φMs)</td>
                <td className="text-right p-2 border">
                  {results.intermediates.combinedSectionRatio.toFixed(3)}
                </td>
                <td className="text-right p-2 border">≤ 1.00</td>
                <td className="text-right p-2 border">
                  {utilCell(results.intermediates.combinedSectionRatio)}
                </td>
                <td className="text-center p-2 border">{statusCell(results.passes.combinedSection)}</td>
              </tr>
              <tr>
                <td className="p-2 border">Combined — Member (N*/φNc + M*/φMbx)</td>
                <td className="text-right p-2 border">
                  {results.intermediates.combinedMemberRatio.toFixed(3)}
                </td>
                <td className="text-right p-2 border">≤ 1.00</td>
                <td className="text-right p-2 border">
                  {utilCell(results.intermediates.combinedMemberRatio)}
                </td>
                <td className="text-center p-2 border">{statusCell(results.passes.combinedMember)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      <p className="text-xs mc-subtle mb-4">
        Section class: {results.sectionClass} · fy = {results.fy} MPa · Le ={' '}
        {(results.Le / 1000).toFixed(2)} m · αm = {results.alphaM.toFixed(2)} · αs ={' '}
        {results.alphaS.toFixed(2)} · governing segment {im.govSegStart.toFixed(2)}–
        {im.govSegEnd.toFixed(2)} m ({im.govFlange} flange in compression)
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
            <p className="font-bold mb-1">
              BENDING [{pct(results.Mmax, results.phiMs)}% section · {pct(results.Mmax, results.phiMbx)}% member]
            </p>
            <p className="italic text-gray-500">
              No holes specified in the flanges — full effective section modulus used (Cl. 5.2.6).
            </p>
            <p>
              λ_f = (b_f − t_w)/(2·t_f)·√(f_y/250) = {im.flangeLambda.toFixed(2)}; ε_p = {im.flangeEp}; ε_y ={' '}
              {im.flangeEy} → {classOf(im.flangeLambda, im.flangeEp, im.flangeEy)}
            </p>
            <p>
              λ_w = d_1/t_w·√(f_y/250) = {im.webLambda.toFixed(2)}; ε_p = {im.webEp}; ε_y = {im.webEy} →{' '}
              {classOf(im.webLambda, im.webEp, im.webEy)}
            </p>
            <p>Section class: {im.sectionClass}</p>
            <p>Z_e = {im.Ze.toExponential(3)} mm³</p>
            <p>
              φM_sx = 0.9 × f_y × Z_e = 0.9 × {im.fy} × {im.Ze.toExponential(2)} / 10⁶ ={' '}
              {im.phiMs.toFixed(1)} kN·m [{pct(results.Mmax, results.phiMs)}%]
            </p>
            <p className="italic text-gray-500">
              Any element providing full, partial or lateral restraint must be designed to transfer 2.5% of
              the critical flange force (Cl. 5.4.3.1).
            </p>
            <p>
              Governing LTB segment: {im.govSegStart.toFixed(2)}–{im.govSegEnd.toFixed(2)} m
              ({im.govFlange} flange in compression) — lowest φM_bx across both flange passes
              (Cl. 5.6). Top-flange restraints segment sagging regions; bottom-flange restraints
              segment hogging regions.
            </p>
            {im.bottomFlangeNoEffect && (
              <p className="italic text-gray-500">
                Note: no hogging regions in this span, so the bottom-flange restraints carry no
                compression and have no effect on Le (tension flange). This is expected for a plain
                sagging beam, not a bug.
              </p>
            )}
            <p className="italic text-gray-500">
              Segment assumed bent in single curvature, not subject to transverse loads — β_m = −1.0 per
              Cl. 5.3.2.4(a). Conservative; can be refined using the α_m override.
            </p>
            <p>
              L_max = r_y × (80 + 50β_m) × √(250/f_y) = {ry.toFixed(0)} × {(80 + 50 * betaM).toFixed(0)} × √(250/
              {im.fy}) = {Lmax.toFixed(0)} mm
            </p>
            <p>
              Segment {segLen.toFixed(0)} mm {ltbRequired ? '>' : '≤'} L_max {Lmax.toFixed(0)} mm → LTB check{' '}
              {ltbRequired ? 'required' : 'not required'} (Cl. 5.3.2.4)
            </p>
            {ltbRequired && (
              <>
                <p>L_eb = k_t·k_l·k_r·L_s = {segLen.toFixed(0)} mm</p>
                <p>
                  M_oa = √[(π²EI_y/L_eb²)(GJ + π²EI_w/L_eb²)] ={' '}
                  {Number.isFinite(moaKnm) ? `${moaKnm.toFixed(1)} kN·m` : 'n/a'}
                </p>
                <p>α_m = {im.alphaM.toFixed(2)} (BMD shape, Cl. 5.6.1.1)</p>
                <p>α_s = 0.6 × (√[(M_sx/M_oa)² + 3] − M_sx/M_oa) = {im.alphaS.toFixed(3)}</p>
                <p>
                  φM_bx = α_m × α_s × φM_sx ≤ φM_sx = {im.phiMbx.toFixed(1)} kN·m [
                  {pct(results.Mmax, results.phiMbx)}%]
                </p>
              </>
            )}
          </div>

          <div className="mb-3">
            <p className="font-bold mb-1">SHEAR [{pct(results.Vmax, results.phiVv)}%]</p>
            <p>
              A_w = d × t_w = {sec.d} × {sec.tw} = {im.Aw.toFixed(0)} mm²
            </p>
            <p>
              d/t_w = {im.dOnTw.toFixed(1)}; slenderness limit = {im.slenderLimit.toFixed(1)} → web{' '}
              {im.webSlender ? 'slender' : 'not slender'}
            </p>
            <p>
              φV_v = 0.9 × 0.6 × f_y × A_w {im.webSlender ? '× reduction ' : ''}= {im.phiVv.toFixed(1)} kN [
              {pct(results.Vmax, results.phiVv)}%]
            </p>
          </div>

          <div className={im.nStar > 0 ? 'mb-3' : ''}>
            <p className="font-bold mb-1">DEFLECTION</p>
            <p>
              Live load category: {im.liveLoadTypeLabel} → ψ_l = {im.psiL}
            </p>
            <p>
              G+{im.psiL}Q: δ = {im.deflectionGpsiLQ.toFixed(1)} mm ≤ limit{' '}
              {im.deflectionLimitGpsiLQ.toFixed(1)} mm → {results.passes.deflectionGpsiLQ ? 'PASS' : 'FAIL'}
            </p>
            <p>
              G: δ = {im.deflectionG.toFixed(1)} mm ≤ limit {im.deflectionLimitG.toFixed(1)} mm →{' '}
              {results.passes.deflectionG ? 'PASS' : 'FAIL'}
            </p>
          </div>

          {im.nStar > 0 && (
            <div>
              <p className="font-bold mb-1">
                COMBINED ACTIONS [{pct(im.combinedMemberRatio, 1)}% member]
              </p>
              <p>
                N* = {im.nStar.toFixed(1)} kN; φNs = {im.phiNs.toFixed(1)} kN; φNc = {im.phiNc.toFixed(1)} kN
              </p>
              <p>
                λ_n = {im.lambdaN.toFixed(1)}; α_c = {im.alphaC.toFixed(3)} (HR, Table 6.3.3(a))
              </p>
              <p>
                Section: N*/φNs + M*/φMs = {im.combinedSectionRatio.toFixed(3)} ≤ 1.0 →{' '}
                {results.passes.combinedSection ? 'PASS' : 'FAIL'} [Cl. 8.4.2.1]
              </p>
              <p>
                Member: N*/φNc + M*/φMbx = {im.combinedMemberRatio.toFixed(3)} ≤ 1.0 →{' '}
                {results.passes.combinedMember ? 'PASS' : 'FAIL'} [Cl. 8.4.2.2]
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm">
          {deflLabel} deflection limit: span /
          <input
            type="number"
            step={10}
            value={inputs.deflLimits.GQ}
            onChange={(e) =>
              onDeflLimitsChange({
                ...inputs.deflLimits,
                GQ: parseInt(e.target.value, 10) || 300,
              })
            }
            className="ml-2 w-20 border rounded px-2 py-1"
          />
        </label>
        <label className="text-sm">
          G deflection limit: span /
          <input
            type="number"
            step={10}
            value={inputs.deflLimits.G}
            onChange={(e) =>
              onDeflLimitsChange({
                ...inputs.deflLimits,
                G: parseInt(e.target.value, 10) || 360,
              })
            }
            className="ml-2 w-20 border rounded px-2 py-1"
          />
        </label>
      </div>

      <div className="space-y-4 mb-4 bg-white p-3 border rounded">
        <div>
          <h3 className="text-sm font-semibold mb-1">Bending Moment Diagram (kN·m)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                reversed
                label={{ value: 'M (kN·m)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <ReferenceLine
                y={results.phiMbx}
                ifOverflow="extendDomain"
                stroke={results.passes.memberMoment ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                label={{ value: 'φMbx', position: 'insideTopRight', fontSize: 10 }}
              />
              <ReferenceLine
                y={results.phiMs}
                ifOverflow="extendDomain"
                stroke={results.passes.sectionMoment ? '#16a34a' : '#dc2626'}
                strokeDasharray="4 2"
                strokeWidth={1}
                label={{ value: 'φMs', position: 'insideBottomRight', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="factoredM"
                stroke="#dc2626"
                name="1.2G+1.5Q"
                dot={false}
              />
              <Line type="monotone" dataKey="servicM" stroke="#2563eb" name="G+Q" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Shear Force Diagram (kN)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'V (kN)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <ReferenceLine
                y={results.phiVv}
                ifOverflow="extendDomain"
                stroke={results.passes.shear ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                label={{ value: 'φVv', position: 'insideTopRight', fontSize: 10 }}
              />
              <ReferenceLine
                y={-results.phiVv}
                ifOverflow="extendDomain"
                stroke={results.passes.shear ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                label={{ value: '-φVv', position: 'insideBottomRight', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="factoredV"
                stroke="#dc2626"
                name="1.2G+1.5Q"
                dot={false}
              />
              <Line type="monotone" dataKey="servicV" stroke="#2563eb" name="G+Q" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Deflection Profile (mm)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={deflData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                label={{ value: 'x (m)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                reversed
                label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <ReferenceLine
                y={results.deflectionLimitGpsiLQ}
                ifOverflow="extendDomain"
                stroke={results.passes.deflectionGpsiLQ ? '#16a34a' : '#dc2626'}
                strokeDasharray="4 2"
                label={{ value: `L/${inputs.deflLimits.GQ}`, position: 'insideTopRight', fontSize: 10 }}
              />
              <ReferenceLine
                y={results.deflectionLimitG}
                ifOverflow="extendDomain"
                stroke={results.passes.deflectionG ? '#16a34a' : '#dc2626'}
                strokeDasharray="2 4"
                label={{ value: `L/${inputs.deflLimits.G}`, position: 'insideBottomRight', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="deltaGpsiLQ" stroke="#2563eb" name={deflLabel} dot={false} />
              <Line type="monotone" dataKey="deltaG" stroke="#9ca3af" name="G" strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button
        onClick={handleExport}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mc-btn-primary"
      >
        Export PDF Report
      </button>
    </section>
  );
}
