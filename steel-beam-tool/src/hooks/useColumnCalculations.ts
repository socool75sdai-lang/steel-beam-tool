import { useMemo } from 'react';
import type { ColumnInputs, ColumnResults } from '@/types/column';
import { evaluateColumn } from '@/engineering/as4100/columnCapacity';

export function useColumnCalculations(inputs: ColumnInputs): ColumnResults {
  return useMemo(() => evaluateColumn(inputs), [inputs]);
}
