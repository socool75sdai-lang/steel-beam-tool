import type { HollowSteelGrade, LiveLoadType, SteelSection } from '@/types';

/** Brace sections are closed (hollow) only — CHS / SHS / RHS. */
export type BraceSectionType = 'CHS' | 'SHS' | 'RHS';

/** Transverse point-load action tag. Wind magnitude is entered signed (+down / -up). */
export type BraceLoadTag = 'G' | 'Q' | 'Wind';

export interface BracePointLoad {
  id: string;
  position: number; // m from end A
  magnitude: number; // kN; Wind signed (+down / -up)
  tag: BraceLoadTag;
}

export interface BraceInputs {
  span: number; // m
  sectionType: BraceSectionType;
  steelGrade: HollowSteelGrade;
  section: SteelSection;
  kx: number; // effective length factor, x-axis; default 1.0
  ky: number; // effective length factor, y-axis; default 1.0
  nStar: number; // kN — single already-factored ultimate axial, applied in every combo
  pointLoads: BracePointLoad[];
  liveLoadType: LiveLoadType; // drives ψc / ψl
  deflLimit: number; // span/denominator; default 360
}

export interface BraceBmdPoint {
  x: number; // m
  moment: number; // kN·m (signed; + sagging)
}

export interface BraceDeflPoint {
  x: number; // m
  delta: number; // mm (positive = downward)
}

export interface BraceIntermediates {
  fy: number; // MPa
  kf: number;
  LeX: number; // m
  LeY: number; // m
  rX: number; // mm
  rY: number; // mm
  lambdaNX: number;
  lambdaNY: number;
  alphaCX: number;
  alphaCY: number;
  sectionClass: string;
  ZeX: number; // mm³
  psiC: number;
  psiL: number;
  liveLoadTypeLabel: string;
  selfWeightKnPerM: number;
  govComboLabel: string;
  EI: number; // N·mm²
}

export interface BraceResults {
  phiNs: number; // kN — axial section capacity
  phiNcX: number; // kN — axial member capacity x
  phiNcY: number; // kN — axial member capacity y
  phiNc: number; // kN — governing (min)
  phiMsx: number; // kN·m — bending section capacity (major axis)
  phiMbx: number; // kN·m — = phiMsx (closed section, no LTB)
  nStar: number; // kN
  mStar: number; // kN·m — governing major-axis moment (worst |M*| across combos)
  govCombo: string; // label of the governing bending combination
  utilNs: number;
  utilNcX: number;
  utilNcY: number;
  utilMsx: number;
  ratioSection: number; // Cl. 8.3.3
  ratioMemberInplane: number; // Cl. 8.4.2
  ratioMemberOutofplane: number; // Cl. 8.4.4
  deflection: number; // mm — self-weight max
  deflectionLimit: number; // mm — span / denominator
  bmd: BraceBmdPoint[]; // governing combo
  deflectionProfile: BraceDeflPoint[]; // self-weight
  passes: {
    axialSection: boolean;
    axialMemberX: boolean;
    axialMemberY: boolean;
    bending: boolean;
    combinedSection: boolean;
    combinedMemberInplane: boolean;
    combinedMemberOutofplane: boolean;
    deflection: boolean;
    overall: boolean;
  };
  intermediates: BraceIntermediates;
}
