import type { SectionType, SteelSection } from '@/types';
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
  return ['UB', 'UC', 'PFC', 'EA', 'SHS', 'CHS', 'RHS'];
}

export function calcSelfWeightKnPerM(section: SteelSection): number {
  return (section.mass_kg_m * 9.81) / 1000;
}

export function calcFy(section: SteelSection): number {
  return section.tf <= 17 ? 300 : 280;
}
