// Cross-check against an independent implementation of the same background
// model: astropy's FlatLambdaCDM with our parameters and massless neutrinos.
// Regenerate the fixture with `python3 scripts/gen-reference.py`.

import { describe, expect, it } from 'vitest';
import { PLANCK2018, createCosmology } from '../../src/physics';
import reference from '../fixtures/astropy-reference.json';

const rel = (x: number, ref: number): number => Math.abs(x / ref - 1);

describe('astropy reference', () => {
  it('uses the same parameters', () => {
    expect(reference.model.H0).toBe(PLANCK2018.H0);
    expect(reference.model.Om0).toBe(PLANCK2018.omegaM);
    expect(reference.model.Tcmb0).toBe(PLANCK2018.TCMB0);
    expect(reference.model.Neff).toBe(PLANCK2018.Neff);
  });

  // With constant degrees of freedom both codes solve the same equations.
  const plain = createCosmology(PLANCK2018, { standardModelDof: false });

  it('matches Ω_γ, Ω_r and Ω_Λ', () => {
    expect(rel(plain.omegaGamma, reference.model.Ogamma0)).toBeLessThan(1e-9);
    expect(rel(plain.omegaR, reference.model.Ogamma0 + reference.model.Onu0)).toBeLessThan(1e-9);
    expect(rel(plain.omegaLambda, reference.model.Ode0)).toBeLessThan(1e-12);
  });

  it('matches t(z) and H(z) for constant g*', () => {
    for (const row of reference.rows) {
      expect(rel(plain.timeAtRedshift(row.z), row.ageSeconds)).toBeLessThan(1e-9);
      expect(rel(plain.hubbleAtScaleFactor(1 / (1 + row.z)), row.hubblePerSecond)).toBeLessThan(1e-9);
    }
  });

  // The Standard Model correction only reshapes the first seconds, so after
  // e± annihilation every later time is shifted by the same few seconds.
  const full = createCosmology();

  it('differs from constant g* only by a shift of seconds after e± annihilation', () => {
    for (const row of reference.rows) {
      const shift = Math.abs(full.timeAtRedshift(row.z) - row.ageSeconds);
      expect(shift).toBeLessThan(10 + 1e-10 * row.ageSeconds);
    }
  });
});
