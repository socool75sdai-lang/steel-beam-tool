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

/**
 * AS1170.0 Table 4.1 short-term combination factor ψc, used in ULS combinations
 * that pair imposed action Q with another short-term action (e.g. wind). Rev 6
 * (Item 2) adds this alongside ψl for the Steel Brace beam-column combos.
 * NOTE: values flagged to the engineer for confirmation against Table 4.1 for any
 * ambiguous category (see plan §8); floor categories default to their ψl value.
 */
export const PSI_C_FACTORS: Record<LiveLoadType, number> = {
  domestic: 0.4,
  office: 0.4,
  parking: 0.4,
  retail: 0.4,
  storage: 0.6,
  roof: 0.0,
};

export function getPsiC(type: LiveLoadType): number {
  return PSI_C_FACTORS[type];
}
