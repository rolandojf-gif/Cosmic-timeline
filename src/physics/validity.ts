// Epistemic tiers: how well each instant is known.
//
// - observed: the universe from neutron–proton freeze-out (T ≈ 1 MeV, t ≈ 1 s)
//   onwards is tested by light-element abundances, the CMB and galaxies.
// - extrapolated: between the electroweak crossover and T ≈ 1 MeV the physics
//   is the laboratory-tested Standard Model, applied on the assumption that the
//   universe was reheated above those energies after inflation.
// - speculative: above the electroweak crossover (inflation, Planck epoch).
//   The model is not used there and no physical values are shown.

/** Electroweak crossover temperature [GeV] (D'Onofrio & Rummukainen 2016, PRD 93, 025003). */
export const ELECTROWEAK_CROSSOVER_GEV = 159.5;

/** Neutron–proton freeze-out scale [GeV] (PDG Review of Particle Physics, BBN review). */
export const NEUTRON_FREEZE_OUT_GEV = 1e-3;

/** QCD chiral crossover temperature [GeV] (HotQCD 2019, PLB 795, 15). */
export const QCD_CROSSOVER_GEV = 0.1565;

export type Tier = 'speculative' | 'extrapolated' | 'observed';

/** Tier of an instant from its photon temperature [GeV]. */
export function tierAtTemperatureGeV(tGeV: number): Tier {
  if (tGeV > ELECTROWEAK_CROSSOVER_GEV) return 'speculative';
  if (tGeV > NEUTRON_FREEZE_OUT_GEV) return 'extrapolated';
  return 'observed';
}
