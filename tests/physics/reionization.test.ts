// Cosmic hydrogen reionization history (Planck 2018 VI / Lewis 2008 tanh model).

import { describe, expect, it } from 'vitest';
import {
  PLANCK2018_DERIVED,
  REIONIZATION_DELTA_Z,
  createCosmology,
  reionizationFraction,
} from '../../src/physics';
import { EPOCHS, resolveEpochs } from '../../src/timeline';

describe('reionization history (Planck 2018 tanh model)', () => {
  it('is exactly 0.5 at the Planck midpoint z_re = 7.82', () => {
    expect(reionizationFraction(PLANCK2018_DERIVED.zReionization.value)).toBeCloseTo(0.5, 12);
    expect(REIONIZATION_DELTA_Z).toBe(0.5);
  });

  it('decreases monotonically with redshift z', () => {
    const zs = [0, 2, 5.3, 6.5, 7, 7.5, 7.82, 8.2, 9, 12, 20, 25, 100];
    let prev = 2;
    for (const z of zs) {
      const x = reionizationFraction(z);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(prev);
      prev = x;
    }
  });

  it('distinguishes firstStars (neutral), reionization (50%), milkyWay (~98%) and completion (z = 5.3)', () => {
    const cosmology = createCosmology();
    const epochs = resolveEpochs(cosmology, EPOCHS);
    const zAt = (id: string) => cosmology.stateAt(epochs.find((e) => e.id === id)!.anchor).physical!.z;

    // First stars (z = 25): still neutral.
    expect(reionizationFraction(zAt('firstStars'))).toBeLessThan(1e-6);
    // Reionization stop (z = 7.82): midpoint.
    expect(reionizationFraction(zAt('reionization'))).toBeCloseTo(0.5, 6);
    // Milky Way stop (~13 Gyr ago, z ≈ 6.84): nearly complete (~97-99%).
    const xMilkyWay = reionizationFraction(zAt('milkyWay'));
    expect(xMilkyWay).toBeGreaterThan(0.95);
    expect(xMilkyWay).toBeLessThan(0.995);
    // Bosman et al. (2022) end of reionization (z = 5.3) and today (z = 0): fully ionized.
    expect(reionizationFraction(5.3)).toBeGreaterThan(0.999);
    expect(reionizationFraction(0)).toBeGreaterThan(0.9999);
  });
});
