import { useMemo } from 'react';
import type { DesignInputs, CapacityResults, DiagramSet } from '@/types';
import { evaluateDesign } from '@/engineering/evaluate';

export function useDesignCalculations(inputs: DesignInputs): {
  results: CapacityResults | null;
  diagrams: DiagramSet | null;
} {
  return useMemo(() => {
    try {
      if (inputs.span <= 0) return { results: null, diagrams: null };
      return evaluateDesign(inputs);
    } catch (e) {
      console.error('Design evaluation error:', e);
      return { results: null, diagrams: null };
    }
  }, [inputs]);
}
