import type { SteelSection } from '@/types';

export interface ShearResult {
  Aw: number;
  Vv: number;
  phiVv: number;
  webSlender: boolean;
}

/**
 * AS4100 Cl. 5.11 — shear capacity of simply-supported beam web.
 * @param section steel section
 * @param fy yield stress (MPa)
 */
export function calcShearCapacity(section: SteelSection, fy: number): ShearResult {
  let Aw: number;
  switch (section.type) {
    case 'UB':
    case 'UC':
    case 'PFC':
    case 'EA':
      Aw = section.d * section.tw;
      break;
    case 'SHS':
    case 'RHS':
      Aw = 2 * section.d * section.tw;
      break;
    case 'CHS':
      Aw = 0.6 * section.Ag;
      break;
    default:
      Aw = section.d * section.tw;
      break;
  }

  const slenderLimit = 82 * Math.sqrt(250 / fy);
  const dOnTw = section.tw > 0 ? section.d / section.tw : 0;
  const webSlender = dOnTw > slenderLimit;

  let Vv = 0.6 * fy * Aw; // N
  if (webSlender && dOnTw > 0) {
    const ratio = slenderLimit / dOnTw;
    Vv = Vv * ratio * ratio;
  }

  const phiVv = (0.9 * Vv) / 1000; // kN

  return { Aw, Vv, phiVv, webSlender };
}
