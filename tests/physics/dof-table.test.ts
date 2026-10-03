// Sanity check of the transcribed g* table against textbook values.
//
// Purpose: detect corruption or truncation of our copy of the table (a shifted
// column, a lost row, a typo in an exponent). It does NOT validate Saikawa &
// Shirai's original calculation, which is more precise than these textbook
// numbers: the tolerances are wide enough to accept their known, physical
// departures from the free-gas values, and narrow enough to catch a mangled copy.

import { describe, expect, it } from 'vitest';
import { DOF_GRHO, DOF_GS, DOF_T_GEV } from '../../src/physics/data/dofTable';
import { gStarRho, gStarS } from '../../src/physics';

const within = (value: number, textbook: number, relTol: number): void => {
  expect(Math.abs(value / textbook - 1)).toBeLessThan(relTol);
};

describe('g* table: structure', () => {
  it('has three aligned columns of 528 rows', () => {
    expect(DOF_T_GEV).toHaveLength(528);
    expect(DOF_GS).toHaveLength(528);
    expect(DOF_GRHO).toHaveLength(528);
  });

  it('spans 10 keV to 1.47e6 GeV, log-spaced by ≈ 5%', () => {
    expect(DOF_T_GEV[0]).toBe(1e-5);
    expect(DOF_T_GEV[DOF_T_GEV.length - 1]).toBeCloseTo(1.46812e6, -1);
    for (let i = 1; i < DOF_T_GEV.length; i++) {
      const ratio = DOF_T_GEV[i]! / DOF_T_GEV[i - 1]!;
      expect(ratio).toBeGreaterThan(1.04);
      expect(ratio).toBeLessThan(1.06);
    }
  });

  it('stays within physical bounds (2 ≤ g* ≤ 106.75)', () => {
    for (const g of [...DOF_GS, ...DOF_GRHO]) {
      expect(g).toBeGreaterThanOrEqual(2);
      expect(g).toBeLessThanOrEqual(106.75);
    }
  });
});

describe('g* table: textbook values', () => {
  it('today: g*ρ ≈ 3.36 and g*s ≈ 3.91 (±1.5%)', () => {
    // Textbook values assume instantaneous neutrino decoupling (N_eff = 3);
    // the table includes the small non-instantaneous correction.
    within(gStarRho(1e-5), 3.36, 0.015);
    within(gStarS(1e-5), 3.91, 0.015);
  });

  it('T ~ 2–10 MeV (photons, e±, three ν): g* ≈ 10.75 (±1.5%)', () => {
    for (const tGeV of [2e-3, 3e-3, 5e-3, 1e-2]) {
      within(gStarRho(tGeV), 10.75, 0.015);
      within(gStarS(tGeV), 10.75, 0.015);
    }
  });

  it('above the electroweak scale (T = 0.3 TeV – 1e6 GeV): g* ≈ 106.75 (±4%)', () => {
    // Saikawa & Shirai find g* stays a few percent below the free-gas 106.75
    // because of interaction corrections; ±4% accepts that and nothing larger.
    for (const tGeV of [300, 1e3, 1e4, 1e5, 1e6]) {
      within(gStarRho(tGeV), 106.75, 0.04);
      within(gStarS(tGeV), 106.75, 0.04);
    }
  });
});
