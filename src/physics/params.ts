// Cosmological parameters.
//
// Planck 2018 results. VI. Cosmological parameters, A&A 641, A6 (2020),
// Table 2, last column: TT,TE,EE+lowE+lensing+BAO (68% limits).
// This is the same combination used by astropy.cosmology.Planck18.
//
// Simplification: neutrinos are treated as massless radiation. The mass of
// the minimal Σm_ν = 0.06 eV is already contained in Ω_m. Its effect on the
// age is ≈ 1 Myr, well inside Planck's ±20 Myr.

export interface CosmologyParams {
  /** Hubble constant [km s^-1 Mpc^-1]. */
  readonly H0: number;
  /** Total matter density today (CDM + baryons + massive ν). */
  readonly omegaM: number;
  /** CMB temperature today [K]. */
  readonly TCMB0: number;
  /** Effective number of neutrino species. */
  readonly Neff: number;
}

export const PLANCK2018: CosmologyParams = {
  H0: 67.66,
  omegaM: 0.3111,
  // Fixsen 2009, ApJ 707, 916.
  TCMB0: 2.7255,
  // Standard-model value used by Planck 2018.
  Neff: 3.046,
};

export interface MeasuredValue {
  readonly value: number;
  /** 68% uncertainty (symmetric). */
  readonly sigma: number;
}

/**
 * Published values derived by Planck 2018 from the same parameter combination.
 * They are not inputs to the model: tests compare the model against them.
 */
export const PLANCK2018_DERIVED = {
  ageGyr: { value: 13.787, sigma: 0.02 },
  omegaLambda: { value: 0.6889, sigma: 0.0056 },
  /** Redshift of the last-scattering surface (optical depth = 1). */
  zStar: { value: 1089.8, sigma: 0.21 },
  /** Redshift of matter–radiation equality. */
  zEq: { value: 3387, sigma: 21 },
  /** Redshift at which reionization is half complete (tanh model). */
  zReionization: { value: 7.82, sigma: 0.71 },
} as const satisfies Record<string, MeasuredValue>;
