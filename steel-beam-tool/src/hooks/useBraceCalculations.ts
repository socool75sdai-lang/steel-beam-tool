import { useMemo } from 'react';
import type { BraceInputs, BraceResults } from '@/types/brace';
import { evaluateBrace } from '@/engineering/as4100/braceCapacity';

export function useBraceCalculations(inputs: BraceInputs): BraceResults {
  return useMemo(() => evaluateBrace(inputs), [inputs]);
}
