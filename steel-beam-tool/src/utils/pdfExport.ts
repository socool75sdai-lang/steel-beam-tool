import type { DesignInputs, CapacityResults, DiagramPoint, DeflectionProfilePoint } from '@/types';
import { jsPDF } from 'jspdf';
import { getPsiL } from '@/engineering/as1170/psiFactors';

export interface PdfExportArgs {
  inputs: DesignInputs;
  results: CapacityResults;
  bmd: DiagramPoint[];
  sfd: DiagramPoint[];
  deflectionGpsiLQ: DeflectionProfilePoint[];
  deflectionG: DeflectionProfilePoint[];
  jobNumber?: string;
  jobName?: string;
}

/**
 * Builds a filesystem-safe download filename: [JobNo]_[JobName]_YYYYMMDD_HHMM.ext
 * Blank parts are omitted (no double underscore); all parts stripped to [A-Za-z0-9_-].
 */
export function buildFilename(jobNo: string, jobName: string, ext: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '');
  const parts = [safe(jobNo), safe(jobName), `${date}_${hhmm}`].filter(Boolean);
  return `${parts.join('_')}.${ext}`;
}

function restraintSummary(r: DesignInputs['restraint']): string {
  if (r.mode === 'simple') {
    return `simple ${r.simpleType} (Le mult ${r.leMultiplier.toFixed(2)})`;
  }
  const fmt = (a: number[]) => `[${a.map((v) => v.toFixed(2)).join(', ')}] m`;
  const top = r.intermediateTop.length > 0 ? `, top-flange restraints at ${fmt(r.intermediateTop)}` : '';
  const bot = r.intermediateBottom.length > 0 ? `, bottom-flange restraints at ${fmt(r.intermediateBottom)}` : '';
  return `advanced ${r.endA}-${r.endB}${top}${bot}`;
}

function fmtExp(value: number): string {
  if (!Number.isFinite(value) || value === 0) return value.toString();
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-2) return value.toExponential(2);
  return value.toFixed(2);
}

function safePct(num: number, denom: number): number {
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return (num / denom) * 100;
}

interface RefLine {
  value: number;
  label: string;
  pass: boolean;
}

function drawDiagram(
  doc: jsPDF,
  points: DiagramPoint[],
  field: 'moment' | 'shear',
  span: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  label: string,
  refLines: RefLine[] = [],
): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(label, originX, originY - 2);
  doc.setFont('helvetica', 'normal');

  // Axes
  doc.setDrawColor(180, 180, 180);
  doc.line(originX, originY + height / 2, originX + width, originY + height / 2);
  doc.line(originX, originY, originX, originY + height);

  if (points.length < 2 || span <= 0) return;

  const values = points.map((p) => p[field]);
  const demandMax = Math.max(...values.map((v) => Math.abs(v)), 1e-9);
  // Scale to include capacity reference lines (mirrors Recharts extendDomain)
  const scaleMax = Math.max(demandMax, ...refLines.map((r) => Math.abs(r.value)));
  const xScale = width / span;
  const yScale = (height / 2) * 0.9;

  // Demand curve
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.3);
  // Moment plots positive (sagging) downward to match the on-screen Recharts BMD
  // (reversed Y axis); shear keeps its original upward-positive orientation.
  const fieldSign = field === 'moment' ? 1 : -1;
  let prevX = originX + points[0].x * xScale;
  let prevY = originY + height / 2 + fieldSign * (points[0][field] / scaleMax) * yScale;
  for (let i = 1; i < points.length; i++) {
    const x = originX + points[i].x * xScale;
    const y = originY + height / 2 + fieldSign * (points[i][field] / scaleMax) * yScale;
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }

  // Capacity reference lines (dashed, green=pass / red=fail)
  for (const ref of refLines) {
    const ry = originY + height / 2 + fieldSign * (ref.value / scaleMax) * yScale;
    const color: [number, number, number] = ref.pass ? [22, 163, 74] : [220, 38, 38];
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.2);
    for (let dx = 0; dx < width; dx += 4) {
      doc.line(originX + dx, ry, originX + Math.min(dx + 2, width), ry);
    }
    doc.setFontSize(7);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(ref.label, originX + width + 1, ry + 1);
    doc.setTextColor(0, 0, 0);
  }

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // Max demand label
  doc.setFontSize(8);
  doc.text(`max |${field}| = ${demandMax.toFixed(2)}`, originX + width - 50, originY + height + 4);
}

function drawDeflectionDiagram(
  doc: jsPDF,
  gqPoints: DeflectionProfilePoint[],
  gPoints: DeflectionProfilePoint[],
  limitGQ: number,
  limitG: number,
  passGQ: boolean,
  passG: boolean,
  span: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  label: string,
): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(label, originX, originY - 2);
  doc.setFont('helvetica', 'normal');

  // Axes — baseline at top (zero deflection); positive deflection plotted downward
  doc.setDrawColor(180, 180, 180);
  doc.line(originX, originY, originX + width, originY);
  doc.line(originX, originY, originX, originY + height);

  if (gqPoints.length < 2 || span <= 0) return;

  const allDeltas = [...gqPoints.map((p) => p.delta), ...gPoints.map((p) => p.delta), limitGQ, limitG];
  const maxDelta = Math.max(...allDeltas.map((v) => Math.abs(v)), 1e-9);
  const xScale = width / span;
  const yScale = (height * 0.85) / maxDelta;

  // G+Q line (blue)
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  for (let i = 1; i < gqPoints.length; i++) {
    doc.line(
      originX + gqPoints[i - 1].x * xScale,
      originY + gqPoints[i - 1].delta * yScale,
      originX + gqPoints[i].x * xScale,
      originY + gqPoints[i].delta * yScale,
    );
  }

  // G line (grey, dashed-approximation via alternate segments)
  doc.setDrawColor(150, 150, 150);
  for (let i = 1; i < gPoints.length; i += 2) {
    doc.line(
      originX + gPoints[i - 1].x * xScale,
      originY + gPoints[i - 1].delta * yScale,
      originX + gPoints[i].x * xScale,
      originY + gPoints[i].delta * yScale,
    );
  }

  // Limit lines (green pass / red fail), each labelled L/<divisor>
  const gqColor: [number, number, number] = passGQ ? [22, 163, 74] : [220, 38, 38];
  const gColor: [number, number, number] = passG ? [22, 163, 74] : [220, 38, 38];
  doc.setFontSize(7);

  doc.setLineWidth(0.2);
  doc.setDrawColor(gqColor[0], gqColor[1], gqColor[2]);
  doc.line(originX, originY + limitGQ * yScale, originX + width, originY + limitGQ * yScale);
  doc.setTextColor(gqColor[0], gqColor[1], gqColor[2]);
  doc.text(`L/${Math.round(span / (limitGQ / 1000))}`, originX + width + 1, originY + limitGQ * yScale + 1, {
    maxWidth: 18,
  });

  doc.setDrawColor(gColor[0], gColor[1], gColor[2]);
  doc.line(originX, originY + limitG * yScale, originX + width, originY + limitG * yScale);
  doc.setTextColor(gColor[0], gColor[1], gColor[2]);
  doc.text(`L/${Math.round(span / (limitG / 1000))}`, originX + width + 1, originY + limitG * yScale + 1, {
    maxWidth: 18,
  });

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
}

export async function exportToPDF(args: PdfExportArgs): Promise<void> {
  const { inputs, results, bmd, sfd, deflectionGpsiLQ, deflectionG } = args;
  const psiL = getPsiL(inputs.liveLoadType);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // ===== Header =====
  // McVeigh branded header bar (occupies 0–20mm)
  doc.setFillColor(36, 60, 48); // --mc-green-dark
  doc.rect(0, 0, 210, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(196, 169, 98); // --mc-gold
  doc.text('McVeigh Consultants', 10, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 240, 232); // --mc-cream
  doc.text('McVeigh Steel Designer', 10, 18);

  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), 170, 12);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text(
    `Section: ${inputs.section.designation}    Span: ${inputs.span.toFixed(2)} m`,
    10,
    27,
  );

  // PASS / FAIL banner
  const pass = results.passes.overall;
  if (pass) {
    doc.setFillColor(34, 197, 94);
  } else {
    doc.setFillColor(239, 68, 68);
  }
  doc.rect(165, 22, 35, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(pass ? 'PASS' : 'FAIL', 170, 27);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // ===== Job metadata block (top of page 1, before inputs) =====
  const lineH = 5;
  const jobNo = (args.jobNumber ?? '').trim();
  const jobNm = (args.jobName ?? '').trim();
  let tShift = 0;
  if (jobNo || jobNm) {
    doc.setFontSize(10);
    let jy = 33;
    if (jobNo) {
      doc.text(`Job No:    ${jobNo}`, 10, jy);
      jy += lineH;
      tShift += lineH;
    }
    if (jobNm) {
      doc.text(`Job Name:  ${jobNm}`, 10, jy);
      tShift += lineH;
    }
  }

  // ===== Inputs (left column) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Inputs', 10, 35 + tShift);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let y = 41 + tShift;
  doc.text(`Span: ${inputs.span.toFixed(2)} m`, 10, y);
  y += lineH;
  doc.text(`Tributary width: ${inputs.tributaryWidth.toFixed(2)} m`, 10, y);
  y += lineH;
  const restraintStr = `Restraint: ${inputs.restraint.mode}, ${restraintSummary(inputs.restraint)}`;
  const restraintLines = doc.splitTextToSize(restraintStr, 90) as string[];
  for (const line of restraintLines) {
    doc.text(line, 10, y);
    y += lineH;
  }
  doc.text('Loads:', 10, y);
  y += lineH;

  const maxLoadY = 85 + tShift;
  for (const p of inputs.loads.point) {
    if (y > maxLoadY) break;
    doc.text(
      `  P: ${p.magnitude.toFixed(2)} kN @ ${p.position.toFixed(0)}% (${p.category})`,
      10,
      y,
    );
    y += lineH;
  }
  for (const l of inputs.loads.line) {
    if (y > maxLoadY) break;
    doc.text(
      `  L: ${l.magnitude.toFixed(2)} kN/m, ${l.start.toFixed(2)}-${l.end.toFixed(2)} m (${l.category})`,
      10,
      y,
    );
    y += lineH;
  }
  for (const a of inputs.loads.area) {
    if (y > maxLoadY) break;
    doc.text(
      `  A: ${a.magnitude.toFixed(2)} kPa, ${a.start.toFixed(2)}-${a.end.toFixed(2)} m (${a.category})`,
      10,
      y,
    );
    y += lineH;
  }

  // ===== Section properties (right column) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Section Properties', 110, 35 + tShift);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const s = inputs.section;
  const sectLines: Array<[string, string]> = [
    ['Designation', s.designation],
    ['Mass', `${s.mass_kg_m.toFixed(1)} kg/m`],
    ['d', `${s.d.toFixed(1)} mm`],
    ['bf', `${s.bf.toFixed(1)} mm`],
    ['tf', `${s.tf.toFixed(2)} mm`],
    ['tw', `${s.tw.toFixed(2)} mm`],
    ['Ix', `${fmtExp(s.Ix)} mm^4`],
    ['Sx', `${fmtExp(s.Sx)} mm^3`],
    ['Zx', `${fmtExp(s.Zx)} mm^3`],
    ['Iy', `${fmtExp(s.Iy)} mm^4`],
    ['J', `${fmtExp(s.J)} mm^4`],
    ['Iw', `${fmtExp(s.Iw)} mm^6`],
    ['fy', `${results.fy.toFixed(0)} MPa`],
  ];

  let yr = 41 + tShift;
  for (const [label, value] of sectLines) {
    doc.text(label, 110, yr);
    doc.text(value, 145, yr);
    yr += lineH;
  }

  // ===== Capacity check table =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const tblY = 115 + tShift;
  doc.text('Design Check Summary', 10, tblY);

  doc.setFontSize(9);
  doc.text('Check', 10, tblY + 5);
  doc.text('Demand', 70, tblY + 5);
  doc.text('Capacity', 105, tblY + 5);
  doc.text('Util', 140, tblY + 5);
  doc.text('Status', 170, tblY + 5);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(10, tblY + 6.5, 200, tblY + 6.5);

  doc.setFont('helvetica', 'normal');

  type Row = {
    label: string;
    demand: string;
    capacity: string;
    util: number;
    pass: boolean;
  };

  const rows: Row[] = [
    {
      label: 'Section moment',
      demand: `${results.Mmax.toFixed(1)} kN.m`,
      capacity: `${results.phiMs.toFixed(1)} kN.m`,
      util: safePct(results.Mmax, results.phiMs),
      pass: results.passes.sectionMoment,
    },
    {
      label: 'Member moment',
      demand: `${results.Mmax.toFixed(1)} kN.m`,
      capacity: `${results.phiMbx.toFixed(1)} kN.m`,
      util: safePct(results.Mmax, results.phiMbx),
      pass: results.passes.memberMoment,
    },
    {
      label: 'Shear',
      demand: `${results.Vmax.toFixed(1)} kN`,
      capacity: `${results.phiVv.toFixed(1)} kN`,
      util: safePct(results.Vmax, results.phiVv),
      pass: results.passes.shear,
    },
    {
      label: `Deflection G+${psiL}Q`,
      demand: `${results.deflectionGpsiLQ.toFixed(1)} mm`,
      capacity: `${results.deflectionLimitGpsiLQ.toFixed(1)} mm`,
      util: safePct(results.deflectionGpsiLQ, results.deflectionLimitGpsiLQ),
      pass: results.passes.deflectionGpsiLQ,
    },
    {
      label: 'Deflection G',
      demand: `${results.deflectionG.toFixed(1)} mm`,
      capacity: `${results.deflectionLimitG.toFixed(1)} mm`,
      util: safePct(results.deflectionG, results.deflectionLimitG),
      pass: results.passes.deflectionG,
    },
  ];

  const rowYs = [127, 133, 139, 145, 151].map((v) => v + tShift);
  rows.forEach((row, i) => {
    const ry = rowYs[i];
    doc.setTextColor(0, 0, 0);
    doc.text(row.label, 10, ry);
    doc.text(row.demand, 70, ry);
    doc.text(row.capacity, 105, ry);

    const overUtil = row.util > 100;
    if (overUtil) doc.setTextColor(239, 68, 68);
    doc.text(`${row.util.toFixed(1)}%`, 140, ry);
    doc.setTextColor(0, 0, 0);

    if (row.pass) {
      doc.setTextColor(34, 197, 94);
      doc.text('PASS', 170, ry);
    } else {
      doc.setTextColor(239, 68, 68);
      doc.text('FAIL', 170, ry);
    }
    doc.setTextColor(0, 0, 0);

    doc.line(10, ry + 1.5, 200, ry + 1.5);
  });

  // ===== Diagrams (page 2) =====
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Diagrams', 10, 15);
  doc.setFont('helvetica', 'normal');

  const diagW = 160;
  drawDiagram(doc, bmd, 'moment', inputs.span, 10, 22, diagW, 40, 'Bending Moment Diagram (kN.m)', [
    {
      value: results.phiMs,
      label: `phiMs = ${results.phiMs.toFixed(1)} kN.m`,
      pass: results.passes.sectionMoment,
    },
    {
      value: results.phiMbx,
      label: `phiMbx = ${results.phiMbx.toFixed(1)} kN.m`,
      pass: results.passes.memberMoment,
    },
  ]);
  drawDiagram(doc, sfd, 'shear', inputs.span, 10, 71, diagW, 40, 'Shear Force Diagram (kN)', [
    { value: results.phiVv, label: `+phiVv = ${results.phiVv.toFixed(1)} kN`, pass: results.passes.shear },
    { value: -results.phiVv, label: `-phiVv = ${results.phiVv.toFixed(1)} kN`, pass: results.passes.shear },
  ]);
  drawDeflectionDiagram(
    doc,
    deflectionGpsiLQ,
    deflectionG,
    results.deflectionLimitGpsiLQ,
    results.deflectionLimitG,
    results.passes.deflectionGpsiLQ,
    results.passes.deflectionG,
    inputs.span,
    10,
    120,
    diagW,
    40,
    'Deflection Profile (mm)',
  );

  // ===== Calculation Sheet (page 3+) =====
  doc.addPage();
  const im = results.intermediates;
  const calcLineH = 5;
  let cy = 20;

  const classLabel: Record<string, string> = {
    compact: 'Compact',
    noncompact: 'Non-compact',
    slender: 'Slender',
  };
  const classOf = (lam: number, ep: number, ey: number): string =>
    lam <= ep ? 'Compact' : lam <= ey ? 'Non-compact' : 'Slender';

  const calcPageHeader = (cont: boolean): void => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      cont
        ? 'McVeigh Steel Designer - Calculation Sheet (cont.)'
        : 'McVeigh Steel Designer - Calculation Sheet',
      10,
      cy,
    );
    doc.setTextColor(0, 0, 0);
    cy += 8;
  };

  const checkOverflow = (): void => {
    if (cy > 270) {
      doc.addPage();
      cy = 20;
      calcPageHeader(true);
    }
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
      for (const w of wrapped) {
        doc.text(w, 14, cy);
        cy += calcLineH;
      }
    }
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(10, cy, 200, cy);
    cy += 3;
    checkOverflow();
  };

  calcPageHeader(false);

  const moaStr = Number.isFinite(im.Moa) ? `${(im.Moa / 1e6).toFixed(1)} kN.m` : 'n/a';
  const flangeCmp = im.flangeLambda <= im.flangeEp ? '<=' : '>';
  const webCmp = im.webLambda <= im.webEp ? '<=' : '>';
  const shearCmp = im.webSlender ? '>' : '<=';

  calcStep('1. Material Properties', '[AS4100 Cl. 2.1]', [
    `fy = ${im.fy.toFixed(0)} MPa   (tf = ${s.tf.toFixed(1)} mm)`,
  ]);
  calcStep('2. Section Classification - Flange', '[AS4100 Cl. 5.2.2]', [
    `lambda_f = (bf / 2tf) x sqrt(fy/250) = ${im.flangeLambda.toFixed(2)}`,
    `Compact limit lambda_ep = ${im.flangeEp}  ->  lambda_f ${flangeCmp} lambda_ep  ->  Flange: ${classOf(im.flangeLambda, im.flangeEp, im.flangeEy)}`,
  ]);
  calcStep('3. Section Classification - Web', '[AS4100 Cl. 5.2.2]', [
    `lambda_w = (d - 2tf)/tw x sqrt(fy/250) = ${im.webLambda.toFixed(2)}`,
    `Compact limit lambda_ep = ${im.webEp}  ->  lambda_w ${webCmp} lambda_ep  ->  Web: ${classOf(im.webLambda, im.webEp, im.webEy)}`,
    `Overall section class: ${classLabel[im.sectionClass] ?? im.sectionClass}`,
  ]);
  calcStep('4. Effective Section Modulus', '[AS4100 Cl. 5.2.3]', [
    `Ze = ${fmtExp(im.Ze)} mm^3   (per ${classLabel[im.sectionClass] ?? im.sectionClass} section)`,
  ]);
  calcStep('5. Section Moment Capacity', '[AS4100 Cl. 5.1]', [
    `Msx = Ze x fy = ${fmtExp(im.Ze)} x ${im.fy.toFixed(0)} = ${fmtExp(im.Msx)} N.mm`,
    `phiMs = 0.9 x Msx / 1e6 = ${im.phiMs.toFixed(1)} kN.m`,
  ]);
  const supportLabel: Record<string, string> = {
    PP: 'Pin-Pin',
    FP: 'Fixed-Pin',
    PF: 'Pin-Fixed',
    FF: 'Fixed-Fixed',
  };
  const supportLines = [
    `Support: ${supportLabel[im.supportCondition] ?? im.supportCondition}`,
    `Governing LTB segment: ${im.govSegStart.toFixed(2)}-${im.govSegEnd.toFixed(2)} m (${im.govFlange} flange in compression)`,
    `Le = ${im.Le.toFixed(2)} m  (lowest phiMbx across top/bottom flange passes, not the longest segment)`,
  ];
  if (im.bottomFlangeNoEffect) {
    supportLines.push(
      'Note: no hogging - bottom-flange restraints carry no compression and do not affect Le (plain sagging beam, as intended).',
    );
  }
  if (im.supportCondition !== 'PP') {
    supportLines.push(
      `End moments (1.2G+1.5Q): M_A = ${im.femA.toFixed(1)} kN.m, M_B = ${im.femB.toFixed(1)} kN.m  (hogging)`,
    );
  }
  calcStep('6. Effective Length & Supports', '[AS4100 Cl. 5.6.3]', supportLines);
  calcStep('7. Reference Buckling Moment', '[AS4100 Cl. 5.6.1.1]', [
    `Moa = (pi/Le) x sqrt(E.Iy x (G.J + pi^2.E.Iw/Le^2)) = ${moaStr}`,
  ]);
  calcStep('8. Member Slenderness Reduction', '[AS4100 Cl. 5.6.1]', [
    `alpha_m = ${im.alphaM.toFixed(2)}   (moment distribution factor)`,
    `alpha_s = 0.6 x (sqrt((Msx/Moa)^2 + 3) - Msx/Moa) = ${im.alphaS.toFixed(3)}`,
  ]);
  calcStep('9. Member Moment Capacity', '[AS4100 Cl. 5.6]', [
    `phiMbx = min(0.9 x alpha_m x alpha_s x Msx, phiMs) = ${im.phiMbx.toFixed(1)} kN.m`,
  ]);
  calcStep('10. Shear Capacity', '[AS4100 Cl. 5.11.4]', [
    `Aw = ${im.Aw.toFixed(0)} mm^2`,
    `d/tw = ${im.dOnTw.toFixed(1)} ${shearCmp} 82.sqrt(250/fy) = ${im.slenderLimit.toFixed(1)}  ->  ${im.webSlender ? 'web slender (Vv reduced)' : 'no web slenderness reduction'}`,
    `phiVv = 0.9 x 0.6 x fy x Aw / 1000 = ${im.phiVv.toFixed(1)} kN`,
  ]);
  if (inputs.axialCompression) {
    calcStep('COMBINED ACTIONS', '[AS4100 Cl. 8.4]', [
      `N* = ${im.nStar.toFixed(1)} kN`,
      `phiNs = 0.9 x Ag x fy = 0.9 x ${s.Ag.toFixed(0)} x ${im.fy.toFixed(0)} / 1000 = ${im.phiNs.toFixed(1)} kN`,
      `lambda_n = (Le/r_min) x sqrt(kf x fy / 250) = ${im.lambdaN.toFixed(1)}   (kf = ${im.kf.toFixed(2)})`,
      `alpha_c = ${im.alphaC.toFixed(3)}   (HR residual stress category, Table 6.3.3(a))`,
      `phiNc = 0.9 x alpha_c x kf x Ag x fy / 1000 = ${im.phiNc.toFixed(1)} kN`,
      `Section: N*/phiNs + M*/phiMs = ${im.combinedSectionRatio.toFixed(3)} <= 1.0  ->  ${results.passes.combinedSection ? 'PASS' : 'FAIL'}  [Cl. 8.4.2.1]`,
      `Member:  N*/phiNc + M*/phiMbx = ${im.combinedMemberRatio.toFixed(3)} <= 1.0  ->  ${results.passes.combinedMember ? 'PASS' : 'FAIL'}  [Cl. 8.4.2.2]`,
    ]);
  }
  calcStep('11. Load Combinations', '[AS1170.0 Cl. 4.2.2]', [
    `ULS governing: ${im.governingCombo}  ->  Mmax = ${im.Mmax.toFixed(1)} kN.m, Vmax = ${im.Vmax.toFixed(1)} kN`,
    `SLS combo: G + psi_l x Q   (psi_l = ${im.psiL}, ${im.liveLoadTypeLabel})`,
  ]);
  calcStep('12. Deflection Check - G+psi_l.Q', '[AS1170.1 Cl. 4 / AS4100 Cl. 1.5.3]', [
    `Live load type: ${im.liveLoadTypeLabel}  ->  psi_l = ${im.psiL}`,
    `delta = ${im.deflectionGpsiLQ.toFixed(1)} mm <= L/${inputs.deflLimits.GQ} = ${im.deflectionLimitGpsiLQ.toFixed(1)} mm  ->  ${results.passes.deflectionGpsiLQ ? 'PASS' : 'FAIL'}`,
  ]);
  calcStep('13. Deflection Check - G only', '[AS4100 Cl. 1.5.3]', [
    `delta = ${im.deflectionG.toFixed(1)} mm <= L/${inputs.deflLimits.G} = ${im.deflectionLimitG.toFixed(1)} mm  ->  ${results.passes.deflectionG ? 'PASS' : 'FAIL'}`,
  ]);

  // ===== Save =====
  doc.save(buildFilename(jobNo, jobNm, 'pdf'));
}
