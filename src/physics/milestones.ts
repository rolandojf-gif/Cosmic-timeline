// Transitions between the eras of the background model, located by their
// physical definition rather than by a tabulated date.

import type { Cosmology } from './cosmology';

export interface Milestone {
  readonly a: number;
  readonly z: number;
  /** Cosmic time [s]. */
  readonly t: number;
}

function milestoneAt(cosmology: Cosmology, a: number): Milestone {
  return { a, z: 1 / a - 1, t: cosmology.timeAtScaleFactor(a) };
}

/** Root of an increasing function of ln a on [lo, hi] by bisection. */
function bisectLnA(f: (a: number) => number, lo: number, hi: number): number {
  let flo = f(Math.exp(lo));
  if (flo > 0 || f(Math.exp(hi)) < 0) throw new RangeError('root not bracketed');
  for (let k = 0; k < 200 && hi - lo > 1e-15; k++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(Math.exp(mid));
    if (fm < 0 === flo < 0) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return Math.exp(0.5 * (lo + hi));
}

/** ρ_r = ρ_m. */
export function matterRadiationEquality(cosmology: Cosmology): Milestone {
  const { omegaM } = cosmology;
  const a = bisectLnA((x) => omegaM / (x * x * x) - cosmology.radiationDensity(x), -30, 0);
  return milestoneAt(cosmology, a);
}

/** ρ_Λ = ρ_m: from here on dark energy dominates the density. */
export function matterLambdaEquality(cosmology: Cosmology): Milestone {
  return milestoneAt(cosmology, Math.cbrt(cosmology.omegaM / cosmology.omegaLambda));
}

/**
 * Deceleration parameter q = 0: the expansion starts to accelerate.
 * q ∝ 2ρ_r + ρ_m − 2ρ_Λ (pressure p = ρ/3 for radiation, −ρ for Λ).
 */
export function accelerationOnset(cosmology: Cosmology): Milestone {
  const { omegaM, omegaLambda } = cosmology;
  const a = bisectLnA(
    (x) => 2 * omegaLambda - omegaM / (x * x * x) - 2 * cosmology.radiationDensity(x),
    -10,
    0,
  );
  return milestoneAt(cosmology, a);
}
