export type SectionType = 'UB' | 'UC' | 'PFC' | 'EA' | 'SHS' | 'CHS' | 'RHS' | 'WB';
export type LoadCategory = 'G' | 'Q';
export type RestraintMode = 'simple' | 'advanced';
export type SimpleRestraint = 'FF' | 'PP' | 'PF' | 'FC' | 'custom';
export type EndRestraint = 'F' | 'P' | 'L' | 'U';
export type SectionClass = 'compact' | 'noncompact' | 'slender';
export type ComboName = '1.2G+1.5Q' | 'G+Q' | 'G';

export interface SteelSection {
  designation: string;
  type: SectionType;
  mass_kg_m: number;
  d: number;
  bf: number;
  tf: number;
  tw: number;
  Ag: number;
  Ix: number;
  Sx: number;
  Zx: number;
  Iy: number;
  J: number;
  Iw: number;
}

export interface PointLoad {
  id: string;
  magnitude: number;
  position: number;
  category: LoadCategory;
}

export interface LineLoad {
  id: string;
  magnitude: number;
  start: number;
  end: number;
  category: LoadCategory;
}

export interface AreaLoad {
  id: string;
  magnitude: number;
  start: number;
  end: number;
  category: LoadCategory;
}

export interface Loads {
  point: PointLoad[];
  line: LineLoad[];
  area: AreaLoad[];
}

export interface RestraintConfig {
  mode: RestraintMode;
  simpleType: SimpleRestraint;
  leMultiplier: number;
  endA: EndRestraint;
  endB: EndRestraint;
  intermediate: number[];
  alphaMOverride: number | null;
}

export interface DeflLimits {
  GQ: number;
  G: number;
}

export interface DesignInputs {
  span: number;
  tributaryWidth: number;
  section: SteelSection;
  loads: Loads;
  restraint: RestraintConfig;
  deflLimits: DeflLimits;
}

export interface DiagramPoint {
  x: number;
  moment: number;
  shear: number;
}

export interface DeflectionProfilePoint {
  x: number; // m from left support
  delta: number; // mm, positive = downward
}

export interface CapacityResults {
  Mmax: number;
  Vmax: number;
  sectionClass: SectionClass;
  fy: number;
  Ze: number;
  phiMs: number;
  phiMbx: number;
  phiVv: number;
  Le: number;
  alphaM: number;
  alphaS: number;
  deflectionGQ: number;
  deflectionG: number;
  deflectionLimitGQ: number;
  deflectionLimitG: number;
  passes: {
    sectionMoment: boolean;
    memberMoment: boolean;
    shear: boolean;
    deflectionGQ: boolean;
    deflectionG: boolean;
    overall: boolean;
  };
}

export interface DiagramSet {
  factored: DiagramPoint[];
  serviceability: DiagramPoint[];
  dead: DiagramPoint[];
  deflectionGQ: DeflectionProfilePoint[];
  deflectionG: DeflectionProfilePoint[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
