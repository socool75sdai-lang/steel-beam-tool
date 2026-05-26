import type { DesignInputs, CapacityResults, DiagramPoint, DeflectionProfilePoint } from '@/types';
import { jsPDF } from 'jspdf';

export interface PdfExportArgs {
  inputs: DesignInputs;
  results: CapacityResults;
  bmd: DiagramPoint[];
  sfd: DiagramPoint[];
  deflectionGQ: DeflectionProfilePoint[];
  deflectionG: DeflectionProfilePoint[];
}

function restraintSummary(r: DesignInputs['restraint']): string {
  if (r.mode === 'simple') {
    return `simple ${r.simpleType} (Le mult ${r.leMultiplier.toFixed(2)})`;
  }
  const inter =
    r.intermediate.length > 0
      ? `, intermediate at [${r.intermediate.map((v) => v.toFixed(2)).join(', ')}] m`
      : '';
  return `advanced ${r.endA}-${r.endB}${inter}`;
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
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1e-9);
  const xScale = width / span;
  const yScale = (height / 2) * 0.9;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.3);
  let prevX = originX + points[0].x * xScale;
  let prevY = originY + height / 2 - (points[0][field] / maxAbs) * yScale;
  for (let i = 1; i < points.length; i++) {
    const x = originX + points[i].x * xScale;
    const y = originY + height / 2 - (points[i][field] / maxAbs) * yScale;
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // Max label
  doc.setFontSize(8);
  doc.text(`max |${field}| = ${maxAbs.toFixed(2)}`, originX + width - 50, originY + height + 4);
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

  // Limit lines (green pass / red fail)
  const gqColor: [number, number, number] = passGQ ? [22, 163, 74] : [220, 38, 38];
  const gColor: [number, number, number] = passG ? [22, 163, 74] : [220, 38, 38];
  doc.setLineWidth(0.2);
  doc.setDrawColor(gqColor[0], gqColor[1], gqColor[2]);
  doc.line(originX, originY + limitGQ * yScale, originX + width, originY + limitGQ * yScale);
  doc.setFontSize(8);
  doc.text(`L/${Math.round(span / (limitGQ / 1000))}`, originX + width + 1, originY + limitGQ * yScale + 1, {
    maxWidth: 15,
  });

  doc.setDrawColor(gColor[0], gColor[1], gColor[2]);
  doc.line(originX, originY + limitG * yScale, originX + width, originY + limitG * yScale);

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

export async function exportToPDF(args: PdfExportArgs): Promise<void> {
  const { inputs, results, bmd, sfd, deflectionGQ, deflectionG } = args;
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

  // ===== Inputs (left column) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Inputs', 10, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let y = 41;
  const lineH = 5;
  doc.text(`Span: ${inputs.span.toFixed(2)} m`, 10, y);
  y += lineH;
  doc.text(`Tributary width: ${inputs.tributaryWidth.toFixed(2)} m`, 10, y);
  y += lineH;
  doc.text(`Restraint: ${inputs.restraint.mode}, ${restraintSummary(inputs.restraint)}`, 10, y);
  y += lineH;
  doc.text('Loads:', 10, y);
  y += lineH;

  const maxLoadY = 85;
  for (const p of inputs.loads.point) {
    if (y > maxLoadY) break;
    doc.text(
      `  P: ${p.magnitude.toFixed(2)} kN @ ${p.position.toFixed(2)} m (${p.category})`,
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
  doc.text('Section Properties', 110, 35);
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

  let yr = 41;
  for (const [label, value] of sectLines) {
    doc.text(label, 110, yr);
    doc.text(value, 145, yr);
    yr += lineH;
  }

  // ===== Capacity check table =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Design Check Summary', 10, 90);

  doc.setFontSize(9);
  doc.text('Check', 10, 95);
  doc.text('Demand', 70, 95);
  doc.text('Capacity', 105, 95);
  doc.text('Util', 140, 95);
  doc.text('Status', 170, 95);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(10, 96.5, 200, 96.5);

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
      label: 'Deflection G+Q',
      demand: `${results.deflectionGQ.toFixed(1)} mm`,
      capacity: `${results.deflectionLimitGQ.toFixed(1)} mm`,
      util: safePct(results.deflectionGQ, results.deflectionLimitGQ),
      pass: results.passes.deflectionGQ,
    },
    {
      label: 'Deflection G',
      demand: `${results.deflectionG.toFixed(1)} mm`,
      capacity: `${results.deflectionLimitG.toFixed(1)} mm`,
      util: safePct(results.deflectionG, results.deflectionLimitG),
      pass: results.passes.deflectionG,
    },
  ];

  const rowYs = [101, 107, 113, 119, 125];
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

  // ===== Diagrams =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Diagrams', 10, 140);
  doc.setFont('helvetica', 'normal');

  drawDiagram(doc, bmd, 'moment', inputs.span, 10, 148, 190, 40, 'Bending Moment Diagram (kN.m)');
  drawDiagram(doc, sfd, 'shear', inputs.span, 10, 197, 190, 40, 'Shear Force Diagram (kN)');
  drawDeflectionDiagram(
    doc,
    deflectionGQ,
    deflectionG,
    results.deflectionLimitGQ,
    results.deflectionLimitG,
    results.passes.deflectionGQ,
    results.passes.deflectionG,
    inputs.span,
    10,
    246,
    190,
    40,
    'Deflection Profile (mm)',
  );

  // ===== Save =====
  doc.save(`steel-beam-design-${new Date().toISOString().slice(0, 10)}.pdf`);
}
