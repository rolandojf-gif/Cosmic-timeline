// Linear growth factor D(a).
//
// Tests verify the Heath 1977 integral against exact limits (EdS), the
// normalisation convention D(1) = 1, monotonicity, and the physical effect
// of Λ on structure growth at late times.

import { describe, expect, it } from 'vitest';
import { createGrowthFactor } from '../../src/physics/growth';
import { PLANCK2018 } from '../../src/physics/params';

describe('growth factor normalisation', () => {
  it('D(1) = 1 for Ω_m = 0.3111 (Planck 2018)', () => {
    // The growth factor is defined as D(a) / D(1), so D(1) must be exactly 1.
    const D = createGrowthFactor(PLANCK2018.omegaM);
    expect(D(1)).toBeCloseTo(1, 12);
  });

  it('D(1) = 1 for Ω_m = 1 (Einstein–de Sitter)', () => {
    const D = createGrowthFactor(1);
    expect(D(1)).toBeCloseTo(1, 12);
  });
});

describe('Einstein–de Sitter limit (Ω_m = 1)', () => {
  // With no cosmological constant, the growing mode is D(a) = a exactly.
  // The normalisation D(a)/D(1) preserves this because D(1) = 1.
  const D = createGrowthFactor(1);

  it.each([
    { a: 0.01 },
    { a: 0.1 },
    { a: 0.5 },
    { a: 1.0 },
  ])('D($a) = $a', ({ a }) => {
    expect(D(a)).toBeCloseTo(a, 6);
  });
});

describe('monotonicity', () => {
  it('D(a) is strictly increasing over 100 log-spaced samples from 1e-4 to 1', () => {
    // In a ΛCDM universe perturbations always grow (in linear theory),
    // so D must be monotonically increasing with scale factor.
    const D = createGrowthFactor(PLANCK2018.omegaM);
    const N = 100;
    const logMin = Math.log(1e-4);
    const logMax = Math.log(1);
    let prev = D(Math.exp(logMin));
    for (let i = 1; i <= N; i++) {
      const a = Math.exp(logMin + (logMax - logMin) * (i / N));
      const curr = D(a);
      expect(curr).toBeGreaterThan(prev);
      prev = curr;
    }
  });
});

describe('early matter era (Ω_m = 0.3111)', () => {
  it('D ∝ a when a ≪ 1 (Λ is negligible)', () => {
    // At high redshift the cosmological constant is dynamically irrelevant
    // and the universe is matter-dominated. In that regime D(a) ∝ a, so
    // D(a)/a should be approximately constant. We compare two early values
    // and require agreement within 1%.
    const D = createGrowthFactor(PLANCK2018.omegaM);
    const ratio1 = D(0.001) / 0.001;
    const ratio2 = D(0.01) / 0.01;
    expect(Math.abs(ratio1 / ratio2 - 1)).toBeLessThan(0.01);
  });
});

describe('Λ suppression of growth (Ω_m = 0.3111)', () => {
  const D = createGrowthFactor(PLANCK2018.omegaM);

  it('D(0.5) > 0.45 (growth has not collapsed)', () => {
    // Even with Λ, structures have grown substantially by a = 0.5 (z = 1).
    // D(0.5) should be well above 0.5 * 0.9 = 0.45.
    expect(D(0.5)).toBeGreaterThan(0.5 * 0.9);
  });

  it('D(1)/D(0.5) < 2 (Λ suppresses growth at late times)', () => {
    // In EdS, D(1)/D(0.5) = 1/0.5 = 2 exactly. With Λ the growth rate
    // slows at late times, so this ratio must be strictly less than 2.
    expect(D(1) / D(0.5)).toBeLessThan(2);
  });
});
