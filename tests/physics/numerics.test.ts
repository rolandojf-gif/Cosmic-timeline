// Numerical correctness: does the code compute what it claims to compute?
// Checked against closed-form solutions, internal consistency and smoothness.

import { describe, expect, it } from 'vitest';
import {
  PLANCK2018,
  createCosmology,
  gStarRho,
  gStarS,
  gevToKelvin,
  photonDensityParameter,
  type Cosmology,
} from '../../src/physics';

const rel = (x: number, ref: number): number => Math.abs(x / ref - 1);

/** n values log-uniformly spaced in [lo, hi]. */
function logSpace(lo: number, hi: number, n: number): number[] {
  const a = Math.log(lo);
  const b = Math.log(hi);
  return Array.from({ length: n }, (_, i) => Math.exp(a + ((b - a) * i) / (n - 1)));
}

const SAMPLE_A = [1e-12, 1e-8, 1e-6, 1e-4, 1e-3, 0.01, 0.1, 0.3, 0.5, 0.77, 1];

describe('photon density', () => {
  it('Ω_γ h² ≈ 2.47e-5 for T = 2.7255 K', () => {
    const h = PLANCK2018.H0 / 100;
    expect(photonDensityParameter(2.7255, PLANCK2018.H0) * h * h).toBeCloseTo(2.4728e-5, 8);
  });
});

describe('closed-form solutions (constant degrees of freedom)', () => {
  const base = { ...PLANCK2018 };

  it('Einstein–de Sitter: t = 2/(3 H0) a^(3/2)', () => {
    const c = createCosmology({ ...base, omegaM: 1 }, { omegaR: 0, standardModelDof: false });
    for (const a of SAMPLE_A) {
      expect(rel(c.timeAtScaleFactor(a), (2 / (3 * c.H0)) * Math.pow(a, 1.5))).toBeLessThan(1e-10);
    }
  });

  it('pure radiation: t = a² / (2 H0)', () => {
    const c = createCosmology({ ...base, omegaM: 0 }, { omegaR: 1, standardModelDof: false });
    for (const a of SAMPLE_A) {
      expect(rel(c.timeAtScaleFactor(a), (a * a) / (2 * c.H0))).toBeLessThan(1e-10);
    }
  });

  it('matter + Λ: t = 2/(3 H0 √Ω_Λ) asinh(√(Ω_Λ/Ω_m) a^(3/2))', () => {
    const c = createCosmology(base, { omegaR: 0, standardModelDof: false });
    const k = 2 / (3 * c.H0 * Math.sqrt(c.omegaLambda));
    for (const a of SAMPLE_A) {
      const exact = k * Math.asinh(Math.sqrt(c.omegaLambda / c.omegaM) * Math.pow(a, 1.5));
      expect(rel(c.timeAtScaleFactor(a), exact)).toBeLessThan(1e-10);
    }
  });

  it('radiation + matter: t = 2/(3 H0 Ω_m²) [(Ω_m a − 2Ω_r) √(Ω_m a + Ω_r) + 2 Ω_r^(3/2)]', () => {
    const omegaR = 1e-4;
    const c = createCosmology({ ...base, omegaM: 1 - omegaR }, { omegaR, standardModelDof: false });
    const om = c.omegaM;
    // The closed form cancels catastrophically for a ≪ Ω_r/Ω_m, so stay above 1e-5.
    for (const a of [1e-5, 1e-4, 1e-3, 0.01, 0.1, 1]) {
      const exact =
        (2 / (3 * c.H0 * om * om)) *
        ((om * a - 2 * omegaR) * Math.sqrt(om * a + omegaR) + 2 * Math.pow(omegaR, 1.5));
      expect(rel(c.timeAtScaleFactor(a), exact)).toBeLessThan(1e-8);
    }
  });
});

describe('tabulation', () => {
  const c: Cosmology = createCosmology();

  // About a thousand independent quadratures, each evaluating g*(T) at every
  // node: ~5 s alone, more when other test files share the CPU. The time limit
  // is a budget for the run, not a tolerance on the result.
  it('interpolated t(a) agrees with direct quadrature', { timeout: 30_000 }, () => {
    for (const a of logSpace(c.scaleFactorAtTime(c.tMin) * 1.0001, 1, 997)) {
      expect(rel(c.timeAtScaleFactor(a), c.integrateTime(a))).toBeLessThan(1e-9);
    }
  });

  it('is insensitive to doubling the grid density', () => {
    // g* is only C1 (PCHIP), so near the QCD crossover the Hermite error is
    // ~1e-10 rather than ~1e-14; still ten orders below any displayed digit.
    const fine = createCosmology(PLANCK2018, { nodesPerLnA: 256 });
    for (const a of logSpace(1e-18, 1, 301)) {
      expect(rel(c.timeAtScaleFactor(a), fine.timeAtScaleFactor(a))).toBeLessThan(1e-9);
    }
    expect(rel(c.age, fine.age)).toBeLessThan(1e-12);
  });

  it('round-trips t → a → t across the whole range', () => {
    let worst = 0;
    for (const t of logSpace(c.tMin, c.age, 100_000)) {
      worst = Math.max(worst, rel(c.timeAtScaleFactor(c.scaleFactorAtTime(t)), t));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('is strictly monotone and finite in time', () => {
    let prevA = 0;
    let prevT = Infinity;
    for (const t of logSpace(c.tMin, c.age, 20_000)) {
      const s = c.stateAt(t);
      if (s.physical === null) continue;
      const { a, temperatureK, hubble, z } = s.physical;
      for (const v of [a, temperatureK, hubble, z]) expect(Number.isFinite(v)).toBe(true);
      expect(a).toBeGreaterThan(prevA);
      expect(temperatureK).toBeLessThan(prevT);
      prevA = a;
      prevT = temperatureK;
    }
  });

  it('reaches a = 1 exactly at the age of the universe', () => {
    expect(c.scaleFactorAtTime(c.age)).toBeCloseTo(1, 14);
    expect(c.timeAtScaleFactor(1)).toBe(c.age);
  });
});

describe('Standard Model degrees of freedom', () => {
  const c = createCosmology();

  it('has the expected limits', () => {
    expect(gStarS(1e-6)).toBeCloseTo(3.931, 3);
    expect(gStarRho(1e-6)).toBeCloseTo(3.383, 3);
    // Above the electroweak scale the table stays below the naive 106.75.
    expect(gStarRho(1e3)).toBeGreaterThan(100);
    expect(gStarRho(1e3)).toBeLessThan(106.75);
  });

  it('inverts T(a) ↔ a(T) consistently through the QCD and e± transitions', () => {
    for (const tGeV of logSpace(1e-6, 1e6, 4001)) {
      const T = gevToKelvin(tGeV);
      expect(rel(c.temperatureAtScaleFactor(c.scaleFactorAtTemperature(T)), T)).toBeLessThan(1e-12);
    }
  });

  it('leaves radiation untouched after e± annihilation and reduces it before', () => {
    const late = c.scaleFactorAtTemperature(gevToKelvin(1e-6));
    expect(c.radiationDensity(late) * Math.pow(late, 4)).toBeCloseTo(c.omegaR, 15);
    const early = c.scaleFactorAtTemperature(gevToKelvin(1));
    expect(c.radiationDensity(early) * Math.pow(early, 4)).toBeLessThan(c.omegaR);
  });

  it('gives a continuous t(T) through the QCD crossover', () => {
    // The local index d ln t / d ln T steepens from -2 towards -3 as g* drops,
    // but must do so continuously: the largest jump between neighbouring
    // samples has to shrink in proportion to the sampling step. A kink or a
    // discontinuity in the tabulation would not shrink.
    const maxJump = (samples: number): number => {
      const temps = logSpace(gevToKelvin(0.05), gevToKelvin(1), samples);
      let prev: number | null = null;
      let worst = 0;
      for (let i = 1; i < temps.length; i++) {
        const t0 = c.timeAtTemperature(temps[i - 1]!);
        const t1 = c.timeAtTemperature(temps[i]!);
        const index = Math.log(t1 / t0) / Math.log(temps[i]! / temps[i - 1]!);
        expect(index).toBeLessThan(-1.9);
        expect(index).toBeGreaterThan(-3.1);
        if (prev !== null) worst = Math.max(worst, Math.abs(index - prev));
        prev = index;
      }
      return worst;
    };
    const coarse = maxJump(400);
    const fine = maxJump(1600);
    expect(fine / coarse).toBeLessThan(0.35);
  });

  it('reports no values before a shortened table instead of throwing', () => {
    // lnAMin = -20 starts the table after the electroweak and freeze-out boundaries.
    const short = createCosmology(PLANCK2018, { lnAMin: -20 });
    const early = short.tMin / 10;
    expect(short.tierAt(early)).not.toBe('speculative');
    expect(short.stateAt(early)).toEqual({ t: early, tier: 'speculative', physical: null });
    expect(short.stateAt(short.tMin).physical).not.toBeNull();
  });
});
