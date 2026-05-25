import type {
  DesignInputs,
  SectionType,
  SteelSection,
  CapacityResults,
} from '@/types';
import { getSectionsByType } from './sectionUtils';
import { evaluateDesign } from '@/engineering/evaluate';

export interface AutoSelectResult {
  section: SteelSection;
  results: CapacityResults;
}

/**
 * Returns the lightest passing section of the given type, or null if none pass.
 * Iterates sections sorted ascending by mass and short-circuits on first match.
 */
export function autoSelectSection(
  inputs: DesignInputs,
  type: SectionType,
): AutoSelectResult | null {
  const candidates = getSectionsByType(type);

  for (const candidate of candidates) {
    const testInputs: DesignInputs = { ...inputs, section: candidate };
    try {
      const { results } = evaluateDesign(testInputs);
      if (results.passes.overall) {
        return { section: candidate, results };
      }
    } catch {
      continue;
    }
  }

  return null;
}
