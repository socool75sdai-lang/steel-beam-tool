import { jsPDF } from 'jspdf';
import type { ColumnInputs, ColumnResults } from '@/types/column';
import { buildFilename } from '@/utils/pdfExport';

function fmtExp(value: number): string {
  if (!Number.isFinite(value) || value === 0) return value.toString();
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-2) return value.toExponential(2);
  return value.toFixed(2);
}

function gradeLabel(grade: string): string {
  switch (grade) {
    case 'G300': return 'Grade 300';
    case 'G350': return 'Grade 350';
    case 'C250': return 'Grade 250';
    case 'C350': return 'Grade 350';
    case 'C450': return 'Grade 450';
    default: return grade;
  }
}

/**
 * Draws the N*-M* interaction diagram for the governing axis using jsPDF line
 * drawing (no external charting library). Axial on Y (up), moment on X.
 */
function drawInteraction(
  doc: jsPDF,
  originX: number,
  originY: number,
  width: number,
  height: number,
  phiNs: number,
  phiNc: number,
  phiMsGov: number,
  phiMbGov: number,
  mStarGov: number,
  nStar: number,
  sectionPass: boolean,
  memberPass: boolean,
): void {
  const nMax = Math.max(phiNs, nStar, 1e-9) * 1.1;
  const mMax = Math.max(phiMsGov, phiMbGov, mStarGov, 1e-9) * 1.1;

  const px = (m: number) => originX + (m / mMax) * width;
  const py = (n: number) => originY + height - (n / nMax) * height;

  // Axes
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(originX, originY, originX, originY + height);          // Y axis
  doc.line(originX, originY + height, originX + width, originY + height); // X axis

  // Section envelope (solid green/red): (0, phiNs) -> (phiMsGov, 0)
  const secColor: [number, number, number] = sectionPass ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(secColor[0], secColor[1], secColor[2]);
  doc.setLineWidth(0.5);
  doc.line(px(0), py(phiNs), px(phiMsGov), py(0));

  // Member envelope (dashed green/red): (0, phiNc) -> (phiMbGov, 0)
  const memColor: [number, number, number] = memberPass ? [22, 163, 74] : [220, 38, 38];
  doc.setDrawColor(memColor[0], memColor[1], memColor[2]);
  doc.setLineWidth(0.4);
  {
    const x1 = px(0), y1 = py(phiNc), x2 = px(phiMbGov), y2 = py(0);
    const segs = 24;
    for (let i = 0; i < segs; i += 2) {
      const t0 = i / segs, t1 = Math.min((i + 1) / segs, 1);
      doc.line(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
    }
  }

  // Design point (filled blue circle) at (mStarGov, nStar)
  doc.setFillColor(29, 78, 216);
  doc.circle(px(mStarGov), py(nStar), 1.4, 'F');

  // Axis labels
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('M* (kN.m)', originX + width - 20, originY + height + 6);
  doc.text('N* (kN)', originX + 1, originY - 2);

  // Endpoint value annotations
  doc.setFontSize(7);
  doc.text(`phiNs = ${phiNs.toFixed(0)}`, originX + 2, py(phiNs) - 1);
  doc.text(`phiNc = ${phiNc.toFixed(0)}`, originX + 2, py(phiNc) + 4);
  doc.text(`phiMs = ${phiMsGov.toFixed(1)}`, px(phiMsGov) - 14, originY + height - 1);
}

export function exportColumnToPDF(
  inputs: ColumnInputs,
  results: ColumnResults,
  jobNumber?: string,
  jobName?: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const s = inputs.section;
  const im = results.intermediates;

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
  doc.text('McVeigh Steel Designer - Column', 10, 18);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), 170, 12);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text(`Section: ${s.designation}    Height: ${inputs.height.toFixed(2)} m`, 10, 27);

  // PASS / FAIL banner
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
    `Height L = ${inputs.height.toFixed(2)} m`,
    `Section: ${s.designation} (${inputs.sectionType})`,
    `Grade: ${gradeLabel(inputs.steelGrade)}   fy = ${im.fy.toFixed(0)} MPa`,
    `k_x = ${inputs.kx.toFixed(2)}   Le_x = ${im.LeX.toFixed(2)} m`,
    `k_y = ${inputs.ky.toFixed(2)}   Le_y = ${im.LeY.toFixed(2)} m`,
    `G = ${inputs.G.toFixed(1)} kN   Q = ${inputs.Q.toFixed(1)} kN`,
    `N* = ${results.nStar.toFixed(1)} kN`,
    `e_x = ${inputs.ex.toFixed(0)} mm   e_y = ${inputs.ey.toFixed(0)} mm`,
    `M*x = ${results.mStarX.toFixed(2)} kN.m   M*y = ${results.mStarY.toFixed(2)} kN.m`,
  ];
  for (const ln of inputLines) { doc.text(ln, 10, y); y += lineH; }

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
  ];
  if (!im.isHollow) {
    props.push(['J', `${fmtExp(s.J)} mm^4`]);
    props.push(['Iw', `${fmtExp(s.Iw)} mm^6`]);
  }
  let yr = 41 + tShift;
  for (const [label, value] of props) {
    doc.text(label, 110, yr);
    doc.text(value, 145, yr);
    yr += lineH;
  }

  // ===== Capacity check table =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const tblY = 110 + tShift;
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
  ];
  if (results.mStarX > 0) {
    rows.push({ label: 'Bending x - Section (phiMsx)', demand: `${results.mStarX.toFixed(2)} kN.m`, capacity: `${results.phiMsx.toFixed(2)} kN.m`, util: results.utilMsx, pass: results.passes.bendingX });
  }
  if (results.mStarY > 0) {
    rows.push({ label: 'Bending y - Section (phiMsy)', demand: `${results.mStarY.toFixed(2)} kN.m`, capacity: `${results.phiMsy.toFixed(2)} kN.m`, util: results.utilMsy, pass: results.passes.bendingY });
  }
  rows.push({ label: 'Combined - Section (Cl. 8.3.3)', demand: results.ratioSection.toFixed(3), capacity: '<= 1.00', util: results.ratioSection, pass: results.passes.combinedSection });
  rows.push({ label: 'Combined - Member in-plane (Cl. 8.4.2)', demand: results.ratioMemberInplane.toFixed(3), capacity: '<= 1.00', util: results.ratioMemberInplane, pass: results.passes.combinedMemberInplane });
  rows.push({ label: 'Combined - Member out-of-plane (Cl. 8.4.4)', demand: results.ratioMemberOutofplane.toFixed(3), capacity: '<= 1.00', util: results.ratioMemberOutofplane, pass: results.passes.combinedMemberOutofplane });

  let ry2 = tblY + 12;
  for (const row of rows) {
    doc.setTextColor(0, 0, 0);
    doc.text(row.label, 10, ry2);
    doc.text(row.demand, 90, ry2);
    doc.text(row.capacity, 120, ry2);
    if (row.util > 1) doc.setTextColor(239, 68, 68);
    doc.text(`${(row.util * 100).toFixed(1)}%`, 150, ry2);
    doc.setTextColor(0, 0, 0);
    if (row.pass) { doc.setTextColor(34, 197, 94); doc.text('PASS', 175, ry2); }
    else { doc.setTextColor(239, 68, 68); doc.text('FAIL', 175, ry2); }
    doc.setTextColor(0, 0, 0);
    doc.line(10, ry2 + 1.5, 200, ry2 + 1.5);
    ry2 += 6;
  }

  // ===== Page 2 - Interaction diagram =====
  const govX = results.mStarX >= results.mStarY;
  const mStarGov = govX ? results.mStarX : results.mStarY;
  const phiMsGov = govX ? results.phiMsx : results.phiMsy;
  const phiMbGov = govX ? results.phiMbx : results.phiMby;
  const sectionPass = results.nStar / results.phiNs + mStarGov / phiMsGov <= 1;
  const memberPass = results.nStar / results.phiNc + mStarGov / phiMbGov <= 1;

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`${govX ? 'N*-M*x' : 'N*-M*y'} Interaction Diagram (AS4100)`, 10, 15);
  doc.setFont('helvetica', 'normal');

  drawInteraction(doc, 25, 30, 150, 120, results.phiNs, results.phiNc, phiMsGov, phiMbGov, mStarGov, results.nStar, sectionPass, memberPass);

  doc.setFontSize(9);
  doc.text('Solid line = section envelope (Cl. 8.3.3); dashed line = member envelope (Cl. 8.4).', 10, 165);
  doc.text('Filled point = design action (M*, N*). Green = inside envelope; red = outside.', 10, 171);

  // ===== Page 3 - Calculation sheet =====
  doc.addPage();
  const calcLineH = 5;
  let cy = 20;

  const calcPageHeader = (cont: boolean): void => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(cont ? 'McVeigh Steel Designer - Column Calculation Sheet (cont.)' : 'McVeigh Steel Designer - Column Calculation Sheet', 10, cy);
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
  const PF = (b: boolean) => (b ? 'PASS' : 'FAIL');

  calcPageHeader(false);

  calcStep('1. Steel grade and fy', '[AS3678 / AS1163]', [
    `Grade ${gradeLabel(inputs.steelGrade)}, fy = ${im.fy.toFixed(0)} MPa`,
    im.isHollow ? 'Hollow section - AS1163 flat fy (independent of thickness)' : 'UC section - AS3678 thickness-dependent fy',
  ]);
  calcStep('2. Section classification', '[AS4100 Cl. 5.2.2]', [
    `Section class: ${im.sectionClass}`,
    im.isHollow ? 'Closed section - compact at practical sizes/grades' : 'I-section classified on flange and web slenderness',
  ]);
  calcStep('3. Effective section modulus', '[AS4100 Cl. 5.2.3-5.2.5]', [
    `Ze_x = ${fmtExp(im.ZeX)} mm^3`,
    `Ze_y = ${fmtExp(im.ZeY)} mm^3`,
  ]);
  calcStep('4. Bending section capacity', '[AS4100 Cl. 5.2.1]', [
    `phiMsx = 0.9 x Ze_x x fy / 1e6 = ${results.phiMsx.toFixed(2)} kN.m`,
    `phiMsy = 0.9 x Ze_y x fy / 1e6 = ${results.phiMsy.toFixed(2)} kN.m`,
  ]);
  calcStep('5. Lateral-torsional buckling', '[AS4100 Cl. 5.6]', im.isHollow
    ? [`No LTB - closed section. phiMbx = phiMsx = ${results.phiMbx.toFixed(2)} kN.m`]
    : [
        `LTB effective length Le_x = ${im.LeX.toFixed(2)} m`,
        `phiMbx (alpha_m=1.0, alpha_s reduction) = ${results.phiMbx.toFixed(2)} kN.m`,
        `phiMby = phiMsy = ${results.phiMby.toFixed(2)} kN.m (no LTB about weak axis)`,
      ]);
  calcStep('6. Factored loads', '[AS1170.1]', [
    `N* = max(1.2G + 1.5Q, G) = max(${(1.2 * inputs.G + 1.5 * inputs.Q).toFixed(1)}, ${inputs.G.toFixed(1)}) = ${results.nStar.toFixed(1)} kN`,
    `M*x = N* x e_y / 1000 = ${results.nStar.toFixed(1)} x ${inputs.ey.toFixed(0)} / 1000 = ${results.mStarX.toFixed(2)} kN.m`,
    `M*y = N* x e_x / 1000 = ${results.nStar.toFixed(1)} x ${inputs.ex.toFixed(0)} / 1000 = ${results.mStarY.toFixed(2)} kN.m`,
  ]);
  calcStep('7. Axial section capacity', '[AS4100 Cl. 6.2.1-6.2.2]', [
    `kf = ${im.kf.toFixed(2)} (Aeff = Ag)`,
    `phiNs = 0.9 x kf x Ag x fy / 1000 = 0.9 x ${im.kf.toFixed(2)} x ${s.Ag.toFixed(0)} x ${im.fy.toFixed(0)} / 1000 = ${results.phiNs.toFixed(1)} kN`,
  ]);
  calcStep('8. Member capacity - x-axis', '[AS4100 Cl. 6.3.3]', [
    `lambda_n_x = (Le_x / r_x) x sqrt(kf x fy / 250) = ${im.lambdaNX.toFixed(1)}`,
    `alpha_c_x = ${im.alphaCX.toFixed(3)}`,
    `phiNc_x = 0.9 x alpha_c_x x kf x Ag x fy / 1000 = ${results.phiNcX.toFixed(1)} kN`,
  ]);
  calcStep('9. Member capacity - y-axis', '[AS4100 Cl. 6.3.3]', [
    `lambda_n_y = (Le_y / r_y) x sqrt(kf x fy / 250) = ${im.lambdaNY.toFixed(1)}`,
    `alpha_c_y = ${im.alphaCY.toFixed(3)}`,
    `phiNc_y = 0.9 x alpha_c_y x kf x Ag x fy / 1000 = ${results.phiNcY.toFixed(1)} kN`,
    `phiNc = min(phiNc_x, phiNc_y) = ${results.phiNc.toFixed(1)} kN`,
  ]);
  calcStep('10. Combined - section', '[AS4100 Cl. 8.3.3]', [
    `N*/phiNs + M*x/phiMsx + M*y/phiMsy = ${results.ratioSection.toFixed(3)} <= 1.0  ->  ${PF(results.passes.combinedSection)}`,
  ]);
  calcStep('11. Combined - member in-plane', '[AS4100 Cl. 8.4.2]', [
    `N*/phiNc + M*x/phiMsx = ${results.ratioMemberInplane.toFixed(3)} <= 1.0  ->  ${PF(results.passes.combinedMemberInplane)}`,
  ]);
  calcStep('12. Combined - member out-of-plane', '[AS4100 Cl. 8.4.4]', [
    `N*/phiNc + M*x/phiMbx = ${results.ratioMemberOutofplane.toFixed(3)} <= 1.0  ->  ${PF(results.passes.combinedMemberOutofplane)}`,
  ]);
  calcStep('13. Overall result', '[AS4100]', [
    `Overall: ${PF(results.passes.overall)}`,
  ]);

  doc.save(buildFilename(jobNo, jobNm, 'pdf'));
}
