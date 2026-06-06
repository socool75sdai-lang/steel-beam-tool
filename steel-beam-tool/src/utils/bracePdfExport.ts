import { jsPDF } from 'jspdf';
import type { BraceInputs, BraceResults, BraceBmdPoint, BraceDeflPoint } from '@/types/brace';
import { buildFilename } from '@/utils/pdfExport';

function fmtExp(value: number): string {
  if (!Number.isFinite(value) || value === 0) return value.toString();
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-2) return value.toExponential(2);
  return value.toFixed(2);
}

function gradeLabel(grade: string): string {
  switch (grade) {
    case 'C250': return 'Grade 250';
    case 'C350': return 'Grade 350';
    case 'C450': return 'Grade 450';
    default: return grade;
  }
}

/** N*-M* interaction diagram drawn with jsPDF lines (no chart lib). */
function drawInteraction(
  doc: jsPDF,
  ox: number,
  oy: number,
  w: number,
  h: number,
  results: BraceResults,
): void {
  const { phiNs, phiNc, phiMsx, phiMbx, mStar, nStar } = results;
  const nMax = Math.max(phiNs, nStar, 1e-9) * 1.1;
  const mMax = Math.max(phiMsx, phiMbx, mStar, 1e-9) * 1.1;
  const px = (m: number) => ox + (m / mMax) * w;
  const py = (n: number) => oy + h - (n / nMax) * h;

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(ox, oy, ox, oy + h);
  doc.line(ox, oy + h, ox + w, oy + h);

  const secColor: [number, number, number] = results.passes.combinedSection ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(secColor[0], secColor[1], secColor[2]);
  doc.setLineWidth(0.5);
  doc.line(px(0), py(phiNs), px(phiMsx), py(0));

  const memColor: [number, number, number] = results.passes.combinedMemberOutofplane ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(memColor[0], memColor[1], memColor[2]);
  doc.setLineWidth(0.4);
  {
    const x1 = px(0), y1 = py(phiNc), x2 = px(phiMbx), y2 = py(0);
    const segs = 24;
    for (let i = 0; i < segs; i += 2) {
      const t0 = i / segs, t1 = Math.min((i + 1) / segs, 1);
      doc.line(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
    }
  }

  doc.setFillColor(29, 78, 216);
  doc.circle(px(mStar), py(nStar), 1.4, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('M* (kN.m)', ox + w - 20, oy + h + 6);
  doc.text('N* (kN)', ox + 1, oy - 2);
  doc.setFontSize(7);
  doc.text(`phiNs = ${phiNs.toFixed(0)}`, ox + 2, py(phiNs) - 1);
  doc.text(`phiNc = ${phiNc.toFixed(0)}`, ox + 2, py(phiNc) + 4);
  doc.text(`phiMs = ${phiMsx.toFixed(1)}`, px(phiMsx) - 14, oy + h - 1);
}

/** Simple signed-curve plot (BMD or deflection) drawn with jsPDF lines. */
function drawCurve(
  doc: jsPDF,
  pts: { x: number; v: number }[],
  span: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  label: string,
  refValue?: number,
  refLabel?: string,
  refPass?: boolean,
): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(label, ox, oy - 2);
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(180, 180, 180);
  doc.line(ox, oy, ox, oy + h); // Y axis
  doc.line(ox, oy, ox + w, oy); // baseline at top (positive plotted downward)

  if (pts.length < 2 || span <= 0) return;
  const maxV = Math.max(...pts.map((p) => Math.abs(p.v)), Math.abs(refValue ?? 0), 1e-9);
  const xScale = w / span;
  const yScale = (h * 0.85) / maxV;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  for (let i = 1; i < pts.length; i++) {
    doc.line(ox + pts[i - 1].x * xScale, oy + pts[i - 1].v * yScale, ox + pts[i].x * xScale, oy + pts[i].v * yScale);
  }

  if (refValue !== undefined && refLabel) {
    const color: [number, number, number] = refPass ? [22, 163, 74] : [220, 38, 38];
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.2);
    const ry = oy + refValue * yScale;
    for (let dx = 0; dx < w; dx += 4) doc.line(ox + dx, ry, ox + Math.min(dx + 2, w), ry);
    doc.setFontSize(7);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(refLabel, ox + w + 1, ry + 1);
    doc.setTextColor(0, 0, 0);
  }
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`max = ${Math.max(...pts.map((p) => Math.abs(p.v))).toFixed(2)}`, ox + w - 40, oy + h + 4);
}

export function exportBraceToPDF(
  inputs: BraceInputs,
  results: BraceResults,
  jobNumber?: string,
  jobName?: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const s = inputs.section;
  const im = results.intermediates;
  const PF = (b: boolean) => (b ? 'PASS' : 'FAIL');

  // ===== Header bar =====
  doc.setFillColor(36, 60, 48);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(196, 169, 98);
  doc.text('McVeigh Consultants', 10, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 240, 232);
  doc.text('McVeigh Steel Designer - Brace', 10, 18);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), 170, 12);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text(`Section: ${s.designation}    Span: ${inputs.span.toFixed(2)} m`, 10, 27);

  if (results.passes.overall) doc.setFillColor(34, 197, 94);
  else doc.setFillColor(239, 68, 68);
  doc.rect(165, 22, 35, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(results.passes.overall ? 'PASS' : 'FAIL', 170, 27);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // ===== Job block =====
  const lineH = 5;
  const jobNo = (jobNumber ?? '').trim();
  const jobNm = (jobName ?? '').trim();
  let tShift = 0;
  if (jobNo || jobNm) {
    doc.setFontSize(10);
    let jy = 33;
    if (jobNo) { doc.text(`Job No:    ${jobNo}`, 10, jy); jy += lineH; tShift += lineH; }
    if (jobNm) { doc.text(`Job Name:  ${jobNm}`, 10, jy); tShift += lineH; }
  }

  // ===== Design inputs (left) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Design Inputs', 10, 35 + tShift);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let y = 41 + tShift;
  const inputLines: string[] = [
    `Span L = ${inputs.span.toFixed(2)} m`,
    `Section: ${s.designation} (${inputs.sectionType})`,
    `Grade: ${gradeLabel(inputs.steelGrade)}   fy = ${im.fy.toFixed(0)} MPa`,
    `k_x = ${inputs.kx.toFixed(2)}   Le_x = ${im.LeX.toFixed(2)} m`,
    `k_y = ${inputs.ky.toFixed(2)}   Le_y = ${im.LeY.toFixed(2)} m`,
    `N* = ${results.nStar.toFixed(1)} kN (factored, all combos)`,
    `Self-weight UDL (G) = ${im.selfWeightKnPerM.toFixed(3)} kN/m`,
    `Live-load category: ${im.liveLoadTypeLabel}  (psi_c = ${im.psiC}, psi_l = ${im.psiL})`,
    `Deflection limit: L/${inputs.deflLimit}`,
  ];
  for (const ln of inputLines) { doc.text(ln, 10, y); y += lineH; }
  if (inputs.pointLoads.length > 0) {
    doc.text('Transverse point loads:', 10, y); y += lineH;
    for (const p of inputs.pointLoads) {
      if (y > 130) break;
      doc.text(`  ${p.magnitude.toFixed(2)} kN @ ${p.position.toFixed(2)} m (${p.tag})`, 10, y);
      y += lineH;
    }
  }

  // ===== Section properties (right) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Section Properties', 110, 35 + tShift);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const props: Array<[string, string]> = [
    ['Designation', s.designation],
    ['Mass', `${s.mass_kg_m.toFixed(1)} kg/m`],
    ['Ag', `${fmtExp(s.Ag)} mm^2`],
    ['Ix', `${fmtExp(s.Ix)} mm^4`],
    ['Iy', `${fmtExp(s.Iy)} mm^4`],
    ['rx', `${im.rX.toFixed(1)} mm`],
    ['ry', `${im.rY.toFixed(1)} mm`],
    ['Ze_x', `${fmtExp(im.ZeX)} mm^3`],
  ];
  let yr = 41 + tShift;
  for (const [label, value] of props) {
    doc.text(label, 110, yr);
    doc.text(value, 145, yr);
    yr += lineH;
  }

  // ===== Capacity check table =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const tblY = 140 + tShift;
  doc.text('Capacity Check Summary', 10, tblY);
  doc.setFontSize(9);
  doc.text('Check', 10, tblY + 5);
  doc.text('Demand', 90, tblY + 5);
  doc.text('Capacity', 120, tblY + 5);
  doc.text('Util', 150, tblY + 5);
  doc.text('Status', 175, tblY + 5);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(10, tblY + 6.5, 200, tblY + 6.5);
  doc.setFont('helvetica', 'normal');

  type Row = { label: string; demand: string; capacity: string; util: number; pass: boolean };
  const rows: Row[] = [
    { label: 'Axial - Section (phiNs)', demand: `${results.nStar.toFixed(1)} kN`, capacity: `${results.phiNs.toFixed(1)} kN`, util: results.utilNs, pass: results.passes.axialSection },
    { label: 'Axial - Member x (phiNc_x)', demand: `${results.nStar.toFixed(1)} kN`, capacity: `${results.phiNcX.toFixed(1)} kN`, util: results.utilNcX, pass: results.passes.axialMemberX },
    { label: 'Axial - Member y (phiNc_y)', demand: `${results.nStar.toFixed(1)} kN`, capacity: `${results.phiNcY.toFixed(1)} kN`, util: results.utilNcY, pass: results.passes.axialMemberY },
    { label: 'Bending x - Section (phiMsx)', demand: `${results.mStar.toFixed(2)} kN.m`, capacity: `${results.phiMsx.toFixed(2)} kN.m`, util: results.utilMsx, pass: results.passes.bending },
    { label: 'Combined - Section (Cl. 8.3.3)', demand: results.ratioSection.toFixed(3), capacity: '<= 1.00', util: results.ratioSection, pass: results.passes.combinedSection },
    { label: 'Combined - Member in-plane (Cl. 8.4.2)', demand: results.ratioMemberInplane.toFixed(3), capacity: '<= 1.00', util: results.ratioMemberInplane, pass: results.passes.combinedMemberInplane },
    { label: 'Combined - Member out-of-plane (Cl. 8.4.4)', demand: results.ratioMemberOutofplane.toFixed(3), capacity: '<= 1.00', util: results.ratioMemberOutofplane, pass: results.passes.combinedMemberOutofplane },
    { label: 'Self-weight deflection', demand: `${results.deflection.toFixed(2)} mm`, capacity: `${results.deflectionLimit.toFixed(2)} mm`, util: results.deflection / results.deflectionLimit, pass: results.passes.deflection },
  ];
  let rty = tblY + 12;
  for (const row of rows) {
    doc.setTextColor(0, 0, 0);
    doc.text(row.label, 10, rty);
    doc.text(row.demand, 90, rty);
    doc.text(row.capacity, 120, rty);
    if (row.util > 1) doc.setTextColor(239, 68, 68);
    doc.text(`${(row.util * 100).toFixed(1)}%`, 150, rty);
    doc.setTextColor(0, 0, 0);
    if (row.pass) { doc.setTextColor(34, 197, 94); doc.text('PASS', 175, rty); }
    else { doc.setTextColor(239, 68, 68); doc.text('FAIL', 175, rty); }
    doc.setTextColor(0, 0, 0);
    doc.line(10, rty + 1.5, 200, rty + 1.5);
    rty += 6;
  }

  // ===== Page 2 - graphs =====
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('N*-M*x Interaction Diagram (AS4100 Cl. 8.3/8.4)', 10, 15);
  doc.setFont('helvetica', 'normal');
  drawInteraction(doc, 25, 24, 150, 95, results);

  drawCurve(
    doc,
    results.bmd.map((p: BraceBmdPoint) => ({ x: p.x, v: p.moment })),
    inputs.span,
    20, 140, 150, 35,
    `Bending Moment Diagram - ${results.govCombo} (kN.m)`,
  );
  drawCurve(
    doc,
    results.deflectionProfile.map((p: BraceDeflPoint) => ({ x: p.x, v: p.delta })),
    inputs.span,
    20, 195, 150, 35,
    'Self-weight Deflection Profile (mm)',
    results.deflectionLimit,
    `L/${inputs.deflLimit}`,
    results.passes.deflection,
  );

  // ===== Page 3 - calc sheet =====
  doc.addPage();
  const calcLineH = 5;
  let cy = 20;
  const calcPageHeader = (cont: boolean): void => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(cont ? 'McVeigh Steel Designer - Brace Calculation Sheet (cont.)' : 'McVeigh Steel Designer - Brace Calculation Sheet', 10, cy);
    doc.setTextColor(0, 0, 0);
    cy += 8;
  };
  const checkOverflow = (): void => {
    if (cy > 270) { doc.addPage(); cy = 20; calcPageHeader(true); }
  };
  const calcStep = (title: string, clause: string, lines: string[]): void => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 10, cy);
    doc.setFont('helvetica', 'normal');
    doc.text(clause, 200, cy, { align: 'right' });
    cy += calcLineH;
    for (const ln of lines) {
      const wrapped = doc.splitTextToSize(ln, 186) as string[];
      for (const w of wrapped) { doc.text(w, 14, cy); cy += calcLineH; }
    }
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(10, cy, 200, cy);
    cy += 3;
    checkOverflow();
  };

  calcPageHeader(false);
  calcStep('1. Section classification', '[AS4100 Cl. 5.2.2]', [
    `fy = ${im.fy.toFixed(0)} MPa (AS1163 flat - closed section)`,
    `Section class: ${im.sectionClass}   Ze_x = ${fmtExp(im.ZeX)} mm^3`,
  ]);
  calcStep('2. Axial member capacity', '[AS4100 Cl. 6.3.3]', [
    `phiNs = 0.9 x kf x Ag x fy / 1000 = ${results.phiNs.toFixed(1)} kN  [${(results.utilNs * 100).toFixed(1)}%]`,
    `lambda_n_x = (Le_x/r_x) x sqrt(kf x fy/250) = ${im.lambdaNX.toFixed(1)}; alpha_c_x = ${im.alphaCX.toFixed(3)} -> phiNc_x = ${results.phiNcX.toFixed(1)} kN`,
    `lambda_n_y = (Le_y/r_y) x sqrt(kf x fy/250) = ${im.lambdaNY.toFixed(1)}; alpha_c_y = ${im.alphaCY.toFixed(3)} -> phiNc_y = ${results.phiNcY.toFixed(1)} kN`,
    `phiNc = min(phiNc_x, phiNc_y) = ${results.phiNc.toFixed(1)} kN`,
  ]);
  calcStep('3. Bending capacity', '[AS4100 Cl. 5]', [
    `phiMsx = 0.9 x Ze_x x fy / 1e6 = ${results.phiMsx.toFixed(2)} kN.m`,
    `phiMbx = phiMsx = ${results.phiMbx.toFixed(2)} kN.m - no LTB (closed section)`,
  ]);
  calcStep('4. Bending actions', '[AS1170.0 Cl. 4.2.2]', [
    `Self-weight UDL (G) = ${im.selfWeightKnPerM.toFixed(3)} kN/m`,
    `Combos: 1.2G+1.5Q | 1.2G+Wu+psi_c.Q (psi_c = ${im.psiC}) | 0.9G+Wu`,
    `Governing: ${results.govCombo} -> M* = ${results.mStar.toFixed(2)} kN.m  [${(results.utilMsx * 100).toFixed(1)}%]`,
  ]);
  calcStep('5. Combined actions', '[AS4100 Cl. 8.3 / 8.4]', [
    `Section (Cl. 8.3.3): N*/phiNs + M*/phiMsx = ${results.ratioSection.toFixed(3)} <= 1.0 -> ${PF(results.passes.combinedSection)}`,
    `Member in-plane (Cl. 8.4.2): N*/phiNc + M*/phiMsx = ${results.ratioMemberInplane.toFixed(3)} <= 1.0 -> ${PF(results.passes.combinedMemberInplane)}`,
    `Member out-of-plane (Cl. 8.4.4): N*/phiNc + M*/phiMbx = ${results.ratioMemberOutofplane.toFixed(3)} <= 1.0 -> ${PF(results.passes.combinedMemberOutofplane)}`,
  ]);
  calcStep('6. Self-weight deflection', '[AS4100 Cl. 1.5.3]', [
    `delta = ${results.deflection.toFixed(2)} mm <= L/${inputs.deflLimit} = ${results.deflectionLimit.toFixed(2)} mm -> ${PF(results.passes.deflection)}`,
  ]);
  calcStep('7. Overall result', '[AS4100]', [`Overall: ${PF(results.passes.overall)}`]);

  doc.save(buildFilename(jobNo, jobNm, 'pdf'));
}
