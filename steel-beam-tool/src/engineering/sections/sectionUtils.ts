import type { SectionType, SteelSection, SteelGrade, HollowSteelGrade } from '@/types';
import { SECTION_DATABASE } from './sectionDatabase';

export function getSectionsByType(type: SectionType): SteelSection[] {
  return SECTION_DATABASE[type];
}

export function getSectionByDesignation(designation: string): SteelSection | undefined {
  for (const type of getAllSectionTypes()) {
    const found = SECTION_DATABASE[type].find((s) => s.designation === designation);
    if (found) return found;
  }
  return undefined;
}

export function getDefaultSection(): SteelSection {
  return SECTION_DATABASE.UB[0];
}

export function getAllSectionTypes(): SectionType[] {
  return ['UB', 'UC', 'PFC', 'EA', 'SHS', 'CHS', 'RHS', 'WB'];
}

export function calcSelfWeightKnPerM(section: SteelSection): number {
  return (section.mass_kg_m * 9.81) / 1000;
}

export function calcFy(section: SteelSection, grade: SteelGrade = 'G300'): number {
  const tf = section.tf;
  if (grade === 'G350') {
    if (tf <= 11) return 360;
    if (tf <= 17) return 340;
    return 330;
  }
  // G300 (existing logic)
  return tf <= 17 ? 300 : 280;
}

/**
 * AS1163 cold-formed hollow sections (SHS/RHS/CHS): fy is flat per grade,
 * independent of wall thickness (unlike AS3678 plate grades used by calcFy).
 */
export function calcFyHollow(grade: HollowSteelGrade): number {
  switch (grade) {
    case 'C250': return 250;
    case 'C350': return 350;
    case 'C450': return 450;
  }
}
