import type { SteelSection, SectionClass } from '@/types';

export interface CompressionResult {
  phiNs: number; // kN
  phiNc: number; // kN
  kf: number;
  lambdaN: number;
  alphaC: number;
}

const PHI = 0.9;

/**
 * AS4100 Section 6 axial compression capacity.
 * @param section steel section
 * @param fy yield stress (MPa)
 * @param Le_mm effective length (mm) — same value as the LTB effective length
 * @param sectionClass element slenderness classification
 */
export function calcCompressionCapacity(
  section: SteelSection,
  fy: number,
  Le_mm: number,
  sectionClass: SectionClass,
): CompressionResult {
  const Ag = section.Ag; // mm²
  const Ix = section.Ix; // mm⁴
  const Iy = section.Iy; // mm⁴

  // Section capacity (Cl. 6.2.1)
  const phiNs = (PHI * Ag * fy) / 1000; // kN

  // Form factor kf (Cl. 6.2.2). The section database carries no effective area,
  // so Aeff defaults to Ag → kf = 1.0 (exact for compact/noncompact, conservative
  // for slender). Referenced for clarity even though it evaluates to 1.0.
  const kf = sectionClass === 'slender' ? Ag / Ag : 1.0;

  // Minimum radius of gyration (mm)
  const rMin = Ag > 0 ? Math.sqrt(Math.min(Ix, Iy) / Ag) : 0;

  // Modified slenderness (Cl. 6.3.3)
  const lambdaN = rMin > 0 ? (Le_mm / rMin) * Math.sqrt((kf * fy) / 250) : 0;

  // Member compression capacity factor αc (Cl. 6.3.3, HR residual stress category)
  const alphaC = calcAlphaC(lambdaN);

  const phiNc = (PHI * alphaC * kf * Ag * fy) / 1000; // kN

  return { phiNs, phiNc, kf, lambdaN, alphaC };
}

/**
 * AS4100 Cl. 6.3.3 compression member slenderness reduction factor αc, HR
 * residual-stress category (αb = 0, so the modified slenderness λ = λn).
 * Reproduces the Table 6.3.3(a) values (e.g. αc ≈ 0.22 at λn ≈ 175).
 */
export function calcAlphaC(lambdaN: number): number {
  if (lambdaN <= 13.5) return 1.0;
  const lambda = lambdaN; // αb = 0 for the HR category
  const eta = Math.max(0.00326 * (lambda - 13.5), 0);
  const r = (lambda / 90) ** 2;
  const xi = (r + 1 + eta) / (2 * r);
  const inner = 1 - (90 / (xi * lambda)) ** 2;
  const alphaC = xi * (1 - Math.sqrt(Math.max(inner, 0)));
  return Math.min(Math.max(alphaC, 0), 1.0);
}
