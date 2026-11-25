// Cosmic hydrogen reionization history (Planck 2018 VI / Lewis 2008 tanh model).
//
// In Planck 2018 VI (Table 2, TT,TE,EE+lowE+lensing+BAO), the midpoint of
// reionization is z_re = 7.82 ± 0.71 under the standard CAMB tanh
// parameterisation (Lewis 2008, Phys. Rev. D 78, 023002, Appendix B) with
// fixed transition width Δz = 0.5:
//
//   y(z) = (1 + z)^(3/2)
//   Δy   = (3/2) * (1 + z_re)^(1/2) * Δz
//   x_H(z) = 0.5 * [1 + tanh((y(z_re) - y(z)) / Δy)]
//
// This gives the fraction of cosmic hydrogen reionized after recombination
// (0 in the dark ages and first stars, 0.5 at z_re = 7.82, ~0.98 at the Milky
// Way anchor z ≈ 6.8, and > 0.999 by z = 5.3).

import { PLANCK2018_DERIVED } from './params';

/** Fixed redshift transition width used by Planck 2018 VI / CAMB. */
export const REIONIZATION_DELTA_Z = 0.5;

/**
 * Fraction of neutral hydrogen reionized by redshift z ∈ [0, ∞), normalised to
 * [0, 1] (excluding the helium factor 1 + f_He, which scales free electrons).
 * Only applies after recombination (z << z_*).
 */
export function reionizationFraction(
  z: number,
  zRe: number = PLANCK2018_DERIVED.zReionization.value,
  deltaZ: number = REIONIZATION_DELTA_Z,
): number {
  const zClamped = Math.max(0, z);
  const y = (1 + zClamped) ** 1.5;
  const yRe = (1 + zRe) ** 1.5;
  const deltaY = 1.5 * Math.sqrt(1 + zRe) * deltaZ;
  return 0.5 * (1 + Math.tanh((yRe - y) / deltaY));
}
