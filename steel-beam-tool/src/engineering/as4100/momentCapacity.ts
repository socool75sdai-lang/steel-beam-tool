import type { SteelSection, SectionClass } from '@/types';

const E = 200_000;     // MPa
const G_MOD = 80_000;  // MPa
const PHI = 0.9;

export interface ClassificationResult {
  flangeLambda: number;
  flangeEp: number;
  flangeEy: number;
  webLambda: number;
  webEp: number;
  webEy: number;
  sectionClass: SectionClass;
  Ze: number;
}

export interface SectionCapacityResult {
  Ze: number;
  Msx: number;        // N·mm
  phiMs: number;      // kN·m
  sectionClass: SectionClass;
  flangeLambda: number;
  flangeEp: number;
  flangeEy: number;
  webLambda: number;
  webEp: number;
  webEy: number;
}

export interface MemberCapacityResult {
  Moa: number;        // N·mm
  alphaS: number;
  phiMbx: number;     // kN·m
}

interface ElementSlenderness {
  lambda: number;
  ep: number;
  ey: number;
}

function classifyLambda(lambda: number, ep: number, ey: number): SectionClass {
  if (lambda <= ep) return 'compact';
  if (lambda <= ey) return 'noncompact';
  return 'slender';
}

function worstClass(a: SectionClass, b: SectionClass): SectionClass {
  const rank: Record<SectionClass, number> = { compact: 0, noncompact: 1, slender: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function computeZe(
  sectionClass: SectionClass,
  critical: ElementSlenderness,
  Sx: number,
  Zx: number,
): number {
  if (sectionClass === 'compact') {
    return Math.min(Sx, 1.5 * Zx);
  }
  if (sectionClass === 'noncompact') {
    const { lambda, ep, ey } = critical;
    return Zx + (Sx - Zx) * (ey - lambda) / (ey - ep);
  }
  // slender
  const { lambda, ey } = critical;
  return Zx * (ey / lambda) ** 2;
}

export function classifySection(section: SteelSection, fy: number): ClassificationResult {
  const k = Math.sqrt(fy / 250);
  const { type, bf, tf, tw, d, Sx, Zx } = section;

  let flangeLambda = 0;
  let webLambda = 0;
  let flangeEp = 0;
  let flangeEy = 0;
  let webEp = 0;
  let webEy = 0;

  if (type === 'UB' || type === 'UC' || type === 'PFC') {
    const bFlange = (bf - tw) / 2;
    flangeLambda = (bFlange / tf) * k;
    flangeEp = 9;
    flangeEy = 16;

    const d1 = d - 2 * tf;
    webLambda = (d1 / tw) * k;
    webEp = 82;
    webEy = 115;
  } else if (type === 'SHS' || type === 'RHS') {
    const bFlat = bf - 2 * tf;
    const lam = (bFlat / tf) * k;
    flangeLambda = lam;
    webLambda = lam;
    flangeEp = 30;
    flangeEy = 40;
    webEp = 30;
    webEy = 40;
  } else if (type === 'CHS') {
    const lam = (d / tf) * (fy / 250);
    flangeLambda = lam;
    webLambda = lam;
    flangeEp = 50;
    flangeEy = 120;
    webEp = 50;
    webEy = 120;
  } else {
    // EA — conservative non-compact
    flangeEp = 8;
    flangeEy = 14;
    webEp = 8;
    webEy = 14;
    const mid = (flangeEp + flangeEy) / 2;
    flangeLambda = mid;
    webLambda = mid;
  }

  const flangeClass = classifyLambda(flangeLambda, flangeEp, flangeEy);
  const webClass = classifyLambda(webLambda, webEp, webEy);
  const sectionClass = worstClass(flangeClass, webClass);

  // Pick critical element (the one matching the worst class; if both match, take more slender ratio)
  const flangeRatio = flangeLambda / flangeEy;
  const webRatio = webLambda / webEy;
  let critical: ElementSlenderness;
  if (flangeClass === sectionClass && webClass === sectionClass) {
    critical = flangeRatio >= webRatio
      ? { lambda: flangeLambda, ep: flangeEp, ey: flangeEy }
      : { lambda: webLambda, ep: webEp, ey: webEy };
  } else if (flangeClass === sectionClass) {
    critical = { lambda: flangeLambda, ep: flangeEp, ey: flangeEy };
  } else {
    critical = { lambda: webLambda, ep: webEp, ey: webEy };
  }

  const Ze = computeZe(sectionClass, critical, Sx, Zx);

  return { flangeLambda, flangeEp, flangeEy, webLambda, webEp, webEy, sectionClass, Ze };
}

export function calcSectionCapacity(section: SteelSection, fy: number): SectionCapacityResult {
  const c = classifySection(section, fy);
  const { Ze, sectionClass } = c;
  const Msx = Ze * fy;             // N·mm
  const phiMs = PHI * Msx / 1e6;   // kN·m
  return {
    Ze,
    Msx,
    phiMs,
    sectionClass,
    flangeLambda: c.flangeLambda,
    flangeEp: c.flangeEp,
    flangeEy: c.flangeEy,
    webLambda: c.webLambda,
    webEp: c.webEp,
    webEy: c.webEy,
  };
}

export function calcMemberCapacity(
  section: SteelSection,
  fy: number,
  Le_mm: number,
  alphaM: number,
): MemberCapacityResult {
  const sec = calcSectionCapacity(section, fy);
  const Msx = sec.Msx;

  if (Le_mm <= 0 || section.Iy <= 0 || section.Iw <= 0) {
    return {
      Moa: Infinity,
      alphaS: 1.0,
      phiMbx: PHI * Msx / 1e6,
    };
  }

  const t1 = (Math.PI ** 2 * E * section.Iy) / (Le_mm ** 2);
  const t2 = G_MOD * section.J + (Math.PI ** 2 * E * section.Iw) / (Le_mm ** 2);
  const Moa = Math.sqrt(t1 * t2);

  const ratio = Msx / Moa;
  const alphaS = 0.6 * (Math.sqrt(ratio * ratio + 3) - ratio);
  const phiMbx_NM = Math.min(PHI * alphaM * alphaS * Msx, PHI * Msx);
  const phiMbx = phiMbx_NM / 1e6;

  return { Moa, alphaS, phiMbx };
}
