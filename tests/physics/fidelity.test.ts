// Fidelity: does the model reproduce the universe as published?
//
// Expected values and their sources are listed in docs/fuentes.md. A tolerance
// is never widened to make a test pass: if a value is wrong, the commit that
// changes it must say why and cite the source.

import { describe, expect, it } from 'vitest';
import {
  ELECTROWEAK_CROSSOVER_GEV,
  GYR,
  JULIAN_YEAR,
  LIGHT_YEAR,
  PLANCK2018,
  PLANCK2018_DERIVED,
  QCD_CROSSOVER_GEV,
  accelerationOnset,
  createCosmology,
  gevToKelvin,
  matterLambdaEquality,
  matterRadiationEquality,
} from '../../src/physics';

const c = createCosmology();
const KYR = 1e3 * JULIAN_YEAR;
const MYR = 1e6 * JULIAN_YEAR;
const GLY = 1e9 * LIGHT_YEAR;

describe('today', () => {
  it('age ≈ 13.787 Gyr (Planck 2018: 13.787 ± 0.020)', () => {
    expect(c.age / GYR).toBeGreaterThan(13.737);
    expect(c.age / GYR).toBeLessThan(13.837);
  });

  it('T(t0) = 2.7255 K and H(t0) = H0 by construction', () => {
    const today = c.stateAt(c.age);
    if (today.physical === null) throw new Error('today must have physical values');
    expect(today.physical.temperatureK).toBeCloseTo(PLANCK2018.TCMB0, 10);
    expect(today.physical.hubble / c.H0).toBeCloseTo(1, 12);
    expect(today.physical.z).toBeCloseTo(0, 12);
  });

  it('Ω_Λ within 1σ of Planck 2018 (0.6889 ± 0.0056)', () => {
    const { value, sigma } = PLANCK2018_DERIVED.omegaLambda;
    expect(Math.abs(c.omegaLambda - value)).toBeLessThan(sigma);
  });

  it('radius of the region we observe today ≈ 46 Gly (45.5–47.0)', () => {
    expect(c.observableRadiusToday / GLY).toBeGreaterThan(45.5);
    expect(c.observableRadiusToday / GLY).toBeLessThan(47.0);
  });
});

describe('recombination', () => {
  const zStar = PLANCK2018_DERIVED.zStar.value;

  it('t(z* = 1089.80) ≈ 380 000 yr (360–390 kyr)', () => {
    const t = c.timeAtRedshift(zStar) / KYR;
    expect(t).toBeGreaterThan(360);
    expect(t).toBeLessThan(390);
  });

  it('T(z*) ≈ 3000 K (2900–3100 K)', () => {
    const T = c.temperatureAtScaleFactor(1 / (1 + zStar));
    expect(T).toBeGreaterThan(2900);
    expect(T).toBeLessThan(3100);
  });

  it('z at t = 380 000 yr ≈ 1100 (1050–1120)', () => {
    const s = c.stateAt(380 * KYR);
    if (s.physical === null) throw new Error('recombination must have physical values');
    expect(s.physical.z).toBeGreaterThan(1050);
    expect(s.physical.z).toBeLessThan(1120);
  });

  it('region we observe today had a radius of ≈ 42 million ly', () => {
    const s = c.stateAt(c.timeAtRedshift(zStar));
    if (s.physical === null) throw new Error('recombination must have physical values');
    const mly = s.physical.observedRegionRadius / (1e6 * LIGHT_YEAR);
    expect(mly).toBeGreaterThan(40);
    expect(mly).toBeLessThan(44);
  });
});

describe('matter–radiation equality', () => {
  const eq = matterRadiationEquality(c);

  it('z_eq within 2% of Planck 2018 (3387 ± 21)', () => {
    expect(Math.abs(eq.z / PLANCK2018_DERIVED.zEq.value - 1)).toBeLessThan(0.02);
  });

  it('t_eq ≈ 50 000 yr (45–57 kyr)', () => {
    expect(eq.t / KYR).toBeGreaterThan(45);
    expect(eq.t / KYR).toBeLessThan(57);
  });
});

describe('dark energy', () => {
  it('ρ_Λ = ρ_m at t ≈ 10.2 Gyr (± 0.3), z ≈ 0.30 (± 0.02)', () => {
    const m = matterLambdaEquality(c);
    expect(Math.abs(m.t / GYR - 10.2)).toBeLessThan(0.3);
    expect(Math.abs(m.z - 0.3)).toBeLessThan(0.02);
  });

  it('acceleration starts (q = 0) at t ≈ 7.6 Gyr (± 0.3), z ≈ 0.64 (± 0.03)', () => {
    const m = accelerationOnset(c);
    expect(Math.abs(m.t / GYR - 7.6)).toBeLessThan(0.3);
    expect(Math.abs(m.z - 0.64)).toBeLessThan(0.03);
  });

  it('acceleration starts before dark energy dominates', () => {
    expect(accelerationOnset(c).t).toBeLessThan(matterLambdaEquality(c).t);
  });
});

describe('reionization', () => {
  it('t(z_re = 7.82) ≈ 650 Myr (600–720)', () => {
    const t = c.timeAtRedshift(PLANCK2018_DERIVED.zReionization.value) / MYR;
    expect(t).toBeGreaterThan(600);
    expect(t).toBeLessThan(720);
  });
});

describe('early universe (Standard Model degrees of freedom)', () => {
  it('t(T = 1e10 K) ≈ 1 s (0.6–1.4 s)', () => {
    const t = c.timeAtTemperature(1e10);
    expect(t).toBeGreaterThan(0.6);
    expect(t).toBeLessThan(1.4);
  });

  it('t(T = 0.1 MeV), onset of nucleosynthesis, ≈ 2 min (100–200 s)', () => {
    const t = c.timeAtTemperature(gevToKelvin(1e-4));
    expect(t).toBeGreaterThan(100);
    expect(t).toBeLessThan(200);
  });

  it('QCD crossover (156.5 MeV) at ≈ 1e-5 s (5e-6 – 5e-5 s)', () => {
    const t = c.timeAtTemperature(gevToKelvin(QCD_CROSSOVER_GEV));
    expect(t).toBeGreaterThan(5e-6);
    expect(t).toBeLessThan(5e-5);
  });

  it('electroweak crossover (159.5 GeV) at ≈ 1e-11 s (3e-12 – 3e-11 s)', () => {
    const t = c.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
    expect(t).toBeGreaterThan(3e-12);
    expect(t).toBeLessThan(3e-11);
  });

  it('constant g* would misplace these instants (why the correction exists)', () => {
    const naive = createCosmology(PLANCK2018, { standardModelDof: false });
    const ratio = naive.timeAtTemperature(1e10) / c.timeAtTemperature(1e10);
    expect(ratio).toBeGreaterThan(1.3);
  });
});

describe('epistemic tiers', () => {
  it('hides physical values above the electroweak crossover', () => {
    const tEW = c.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
    expect(c.stateAt(tEW * 0.5).physical).toBeNull();
    expect(c.stateAt(1e-43).tier).toBe('speculative');
    expect(c.stateAt(tEW * 2).tier).toBe('extrapolated');
  });

  it('marks the universe after t ≈ 1 s as observed', () => {
    expect(c.stateAt(0.1).tier).toBe('extrapolated');
    expect(c.stateAt(10).tier).toBe('observed');
    expect(c.stateAt(c.age).tier).toBe('observed');
  });
});
