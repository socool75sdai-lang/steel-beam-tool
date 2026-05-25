# Agent: type-definitions

**Wave:** 1
**Depends on:** Wave 0
**Output:** `src/types/index.ts`

## Responsibility
Single source of truth for all shared TypeScript interfaces and enums used across the codebase. No runtime logic.

## Required exports

```ts
export type SectionType = 'UB' | 'UC' | 'PFC' | 'EA' | 'SHS' | 'CHS' | 'RHS';
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
  d: number;     // mm
  bf: number;    // mm
  tf: number;    // mm
  tw: number;    // mm
  Ag: number;    // mm²
  Ix: number;    // mm⁴
  Sx: number;    // mm³
  Zx: number;    // mm³
  Iy: number;    // mm⁴
  J:  number;    // mm⁴
  Iw: number;    // mm⁶
}

export interface PointLoad { id: string; magnitude: number; position: number; category: LoadCategory; }
export interface LineLoad  { id: string; magnitude: number; start: number; end: number; category: LoadCategory; }
export interface AreaLoad  { id: string; magnitude: number; start: number; end: number; category: LoadCategory; }

export interface Loads {
  point: PointLoad[];
  line: LineLoad[];
  area: AreaLoad[];
}

export interface RestraintConfig {
  mode: RestraintMode;
  simpleType: SimpleRestraint;
  leMultiplier: number;            // used when simpleType === 'custom'
  endA: EndRestraint;
  endB: EndRestraint;
  intermediate: number[];          // positions in m
  alphaMOverride: number | null;
}

export interface DeflLimits { GQ: number; G: number; }   // span/value (denominators)

export interface DesignInputs {
  span: number;                    // m
  tributaryWidth: number;          // m
  section: SteelSection;
  loads: Loads;
  restraint: RestraintConfig;
  deflLimits: DeflLimits;
}

export interface DiagramPoint { x: number; moment: number; shear: number; }

export interface CapacityResults {
  Mmax: number;                    // kN·m  (factored 1.2G+1.5Q)
  Vmax: number;                    // kN    (factored 1.2G+1.5Q)
  sectionClass: SectionClass;
  fy: number;                      // MPa
  Ze: number;                      // mm³
  phiMs: number;                   // kN·m
  phiMbx: number;                  // kN·m
  phiVv: number;                   // kN
  Le: number;                      // mm
  alphaM: number;
  alphaS: number;
  deflectionGQ: number;            // mm
  deflectionG: number;             // mm
  deflectionLimitGQ: number;       // mm
  deflectionLimitG: number;        // mm
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
  factored: DiagramPoint[];        // 1.2G+1.5Q
  serviceability: DiagramPoint[];  // G+Q
  dead: DiagramPoint[];            // G
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

## Acceptance criteria
- `npx tsc --noEmit` passes.
- Every interface property is explicitly typed (no `any`).
- File is `.ts` (not `.tsx`) and contains zero JSX or runtime code.
