// Linear growth factor of matter density perturbations, D(a), normalised to
// D(1) = 1.
//
// For pressureless matter and a cosmological constant the growing mode is
// (Heath 1977, MNRAS 179, 351):
//
//   D(a) ∝ E(a) ∫_0^a da' / (a' E(a'))^3,   E(a)^2 = Ω_m a^-3 + Ω_Λ
//
// Radiation is left out: it only matters before matter–radiation equality
// (z ≈ 3400), long before any structure the scene draws. In the matter era
// D ∝ a, which the tests check.

import { compositeGaussLegendre5 } from './integrate';

export interface GrowthFactor {
  /** D(a) / D(1). */
  (a: number): number;
}

export function createGrowthFactor(omegaM: number): GrowthFactor {
  const omegaL = 1 - omegaM;
  const E = (a: number): number => Math.sqrt(omegaM / (a * a * a) + omegaL);
  // Substitute a = u², which removes the a^{3/2} behaviour of the integrand at 0.
  const integral = (a: number): number =>
    compositeGaussLegendre5(
      (u) => {
        const x = u * u;
        const aE = x * E(x);
        return (2 * u) / (aE * aE * aE);
      },
      0,
      Math.sqrt(a),
      64,
    );
  const unnormalised = (a: number): number => E(a) * integral(a);
  const today = unnormalised(1);
  return (a: number) => unnormalised(a) / today;
}
