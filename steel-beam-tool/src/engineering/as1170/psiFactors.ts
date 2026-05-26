import type { LiveLoadType } from '@/types';

export const PSI_L_FACTORS: Record<LiveLoadType, number> = {
  domestic: 0.4,
  office: 0.4,
  parking: 0.4,
  retail: 0.4,
  storage: 0.6,
  roof: 0.0,
};

export const LIVE_LOAD_LABELS: Record<LiveLoadType, string> = {
  domestic: 'Domestic / Residential',
  office: 'Office',
  parking: 'Parking',
  retail: 'Retail / Commercial',
  storage: 'Storage',
  roof: 'Roof (other)',
};

export function getPsiL(type: LiveLoadType): number {
  return PSI_L_FACTORS[type];
}
