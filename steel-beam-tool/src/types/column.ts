import type { SteelSection, SteelGrade, HollowSteelGrade } from '@/types';

export type ColumnSectionType = 'UC' | 'SHS' | 'RHS' | 'CHS';

export interface ColumnInputs {
  height: number;             // m
  sectionType: ColumnSectionType;
  steelGrade: SteelGrade | HollowSteelGrade;
  section: SteelSection;
  kx: number;                 // effective length factor, x-axis; default 1.0
  ky: number;                 // effective length factor, y-axis; default 1.0
  G: number;                  // kN, unfactored dead load
  Q: number;                  // kN, unfactored live load
  ex: number;                 // mm, eccentricity x-direction; default 0
  ey: number;                 // mm, eccentricity y-direction; default 0
}

export interface ColumnIntermediates {
  fy: number;                 // MPa
  kf: number;                 // form factor (1.0)
  LeX: number;                // m, effective length x-axis
  LeY: number;                // m, effective length y-axis
  rX: number;                 // mm, radius of gyration x
  rY: number;                 // mm, radius of gyration y
  lambdaNX: number;           // modified slenderness x
  lambdaNY: number;           // modified slenderness y
  alphaCX: number;            // compression factor x
  alphaCY: number;            // compression factor y
  sectionClass: string;
  ZeX: number;                // mm3, effective section modulus x
  ZeY: number;                // mm3, effective section modulus y
  isHollow: boolean;
}

export interface ColumnResults {
  phiNs: number;              // kN — axial section capacity
  phiNcX: number;             // kN — axial member capacity, x-axis
  phiNcY: number;             // kN — axial member capacity, y-axis
  phiNc: number;              // kN — governing member capacity (min of x, y)
  phiMsx: number;             // kN.m — bending section capacity x-axis
  phiMsy: number;             // kN.m — bending section capacity y-axis
  phiMbx: number;             // kN.m — bending member capacity x-axis (LTB for UC; = phiMsx for hollow)
  phiMby: number;             // kN.m — = phiMsy (no LTB for y-axis)
  nStar: number;              // kN — factored axial load
  mStarX: number;             // kN.m — factored moment x-axis
  mStarY: number;             // kN.m — factored moment y-axis
  utilNs: number;             // N*/phiNs ratio
  utilNcX: number;            // N*/phiNc_x ratio
  utilNcY: number;            // N*/phiNc_y ratio
  utilMsx: number;            // M*x/phiMsx ratio (0 if M*x=0)
  utilMsy: number;            // M*y/phiMsy ratio (0 if M*y=0)
  ratioSection: number;       // combined section ratio Cl. 8.3.3
  ratioMemberInplane: number; // combined member in-plane Cl. 8.4.2
  ratioMemberOutofplane: number; // combined member out-of-plane Cl. 8.4.4
  passes: {
    axialSection: boolean;
    axialMemberX: boolean;
    axialMemberY: boolean;
    bendingX: boolean;          // always true if M*x = 0
    bendingY: boolean;          // always true if M*y = 0
    combinedSection: boolean;
    combinedMemberInplane: boolean;
    combinedMemberOutofplane: boolean;
    overall: boolean;
  };
  intermediates: ColumnIntermediates;
}
