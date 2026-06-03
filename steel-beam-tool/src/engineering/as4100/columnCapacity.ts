import type { SteelGrade, HollowSteelGrade } from '@/types';
import type { ColumnInputs, ColumnResults, ColumnIntermediates } from '@/types/column';
import { calcFy, calcFyHollow } from '@/engineering/sections/sectionUtils';
import { calcSectionCapacity, calcMemberCapacity } from '@/engineering/as4100/momentCapacity';
import { calcAlphaC } from '@/engineering/as4100/compressionCapacity';

const PHI = 0.9;

/**
 * AS4100 column (beam-column) evaluation — Cl. 6 (compression) + Cl. 5 (bending)
 * + Cl. 8.3/8.4 (combined actions). All capacities use phi = 0.9.
 *
 * Eccentricity model (AS1170.1): N* = max(1.2G + 1.5Q, G); e_y -> M*x (bending
 * about x-axis), e_x -> M*y (bending about y-axis).
 */
export function evaluateColumn(inputs: ColumnInputs): ColumnResults {
  const { section, height, kx, ky, G, Q, ex, ey, sectionType, steelGrade } = inputs;
  const isHollow = sectionType !== 'UC';

  // --- Material: AS3678 thickness-dependent for UC; AS1163 flat for hollow ---
  const fy = isHollow
    ? calcFyHollow(steelGrade as HollowSteelGrade)
    : calcFy(section, steelGrade as SteelGrade);

  const Ag = section.Ag; // mm^2
  const kf = 1.0;        // conservative per HANDOVER 4.3.2 (Aeff = Ag)

  // --- Effective lengths (metres for display, mm for slenderness) ---
  const LeX = kx * height; // m
  const LeY = ky * height; // m

  // --- Radii of gyration (mm) ---
  const rX = Ag > 0 ? Math.sqrt(section.Ix / Ag) : 0;
  const rY = Ag > 0 ? Math.sqrt(section.Iy / Ag) : 0;

  // --- Axial section capacity (Cl. 6.2) ---
  const phiNs = (PHI * kf * Ag * fy) / 1000; // kN

  // --- Axial member capacity per axis (Cl. 6.3) ---
  const lambdaNX = rX > 0 ? (LeX * 1000 / rX) * Math.sqrt((kf * fy) / 250) : 0;
  const lambdaNY = rY > 0 ? (LeY * 1000 / rY) * Math.sqrt((kf * fy) / 250) : 0;
  const alphaCX = calcAlphaC(lambdaNX);
  const alphaCY = calcAlphaC(lambdaNY);
  const phiNcX = (PHI * alphaCX * kf * Ag * fy) / 1000; // kN
  const phiNcY = (PHI * alphaCY * kf * Ag * fy) / 1000; // kN
  const phiNc = Math.min(phiNcX, phiNcY);

  // --- Bending section capacity (Cl. 5.2) ---
  // Strong axis reuses the beam tool's classification + Ze (from Sx, Zx).
  const secCap = calcSectionCapacity(section, fy);
  const ZeX = secCap.Ze;                        // mm^3
  const sectionClass = secCap.sectionClass;

  // Weak axis: the section DB carries no Sy/Zy. For symmetric sections (SHS/CHS,
  // Ix = Iy) Ze_y = Ze_x. Otherwise use the elastic weak-axis modulus Iy/(bf/2)
  // (conservative — ignores the plastic shape factor).
  const symmetric = Math.abs(section.Ix - section.Iy) < 1e-6 * Math.max(section.Ix, 1);
  const ZeY = symmetric ? ZeX : (section.bf > 0 ? section.Iy / (section.bf / 2) : ZeX);

  const phiMsx = (PHI * ZeX * fy) / 1e6; // kN.m
  const phiMsy = (PHI * ZeY * fy) / 1e6; // kN.m

  // --- Bending member capacity / LTB (Cl. 5.6) ---
  // Closed (hollow) sections: no LTB -> phiMbx = phiMsx. UC: reuse LTB engine
  // with Le_x as the effective length and alpha_m = 1.0 (uniform-moment, conservative).
  const phiMbx = isHollow
    ? phiMsx
    : calcMemberCapacity(section, fy, LeX * 1000, 1.0).phiMbx;
  const phiMby = phiMsy; // no LTB about the weak axis

  // --- Factored actions (AS1170.1) ---
  const nStar = Math.max(1.2 * G + 1.5 * Q, G); // kN
  const mStarX = (nStar * ey) / 1000; // kN.m (e_y in mm)
  const mStarY = (nStar * ex) / 1000; // kN.m (e_x in mm)

  // --- Utilisations ---
  const utilNs = phiNs > 0 ? nStar / phiNs : Infinity;
  const utilNcX = phiNcX > 0 ? nStar / phiNcX : Infinity;
  const utilNcY = phiNcY > 0 ? nStar / phiNcY : Infinity;
  const utilMsx = mStarX > 0 ? mStarX / phiMsx : 0;
  const utilMsy = mStarY > 0 ? mStarY / phiMsy : 0;

  // --- Combined actions ---
  const ratioSection =
    (phiNs > 0 ? nStar / phiNs : Infinity) +
    (phiMsx > 0 ? mStarX / phiMsx : 0) +
    (phiMsy > 0 ? mStarY / phiMsy : 0); // Cl. 8.3.3
  const ratioMemberInplane =
    (phiNc > 0 ? nStar / phiNc : Infinity) +
    (phiMsx > 0 ? mStarX / phiMsx : 0); // Cl. 8.4.2
  const ratioMemberOutofplane =
    (phiNc > 0 ? nStar / phiNc : Infinity) +
    (phiMbx > 0 ? mStarX / phiMbx : 0); // Cl. 8.4.4

  const axialSection = utilNs <= 1;
  const axialMemberX = utilNcX <= 1;
  const axialMemberY = utilNcY <= 1;
  const bendingX = mStarX <= 0 ? true : utilMsx <= 1;
  const bendingY = mStarY <= 0 ? true : utilMsy <= 1;
  const combinedSection = ratioSection <= 1;
  const combinedMemberInplane = ratioMemberInplane <= 1;
  const combinedMemberOutofplane = ratioMemberOutofplane <= 1;
  const overall =
    axialSection &&
    axialMemberX &&
    axialMemberY &&
    bendingX &&
    bendingY &&
    combinedSection &&
    combinedMemberInplane &&
    combinedMemberOutofplane;

  const intermediates: ColumnIntermediates = {
    fy,
    kf,
    LeX,
    LeY,
    rX,
    rY,
    lambdaNX,
    lambdaNY,
    alphaCX,
    alphaCY,
    sectionClass,
    ZeX,
    ZeY,
    isHollow,
  };

  return {
    phiNs,
    phiNcX,
    phiNcY,
    phiNc,
    phiMsx,
    phiMsy,
    phiMbx,
    phiMby,
    nStar,
    mStarX,
    mStarY,
    utilNs,
    utilNcX,
    utilNcY,
    utilMsx,
    utilMsy,
    ratioSection,
    ratioMemberInplane,
    ratioMemberOutofplane,
    passes: {
      axialSection,
      axialMemberX,
      axialMemberY,
      bendingX,
      bendingY,
      combinedSection,
      combinedMemberInplane,
      combinedMemberOutofplane,
      overall,
    },
    intermediates,
  };
}
