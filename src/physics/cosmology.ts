// Flat ΛCDM background with radiation, matter and a cosmological constant.
//
//   H(a)^2 = H0^2 [ Ω_r a^-4 F(a) + Ω_m a^-3 + Ω_Λ ],   Ω_Λ = 1 - Ω_m - Ω_r
//
// F(a) corrects radiation for the changing Standard Model degrees of freedom
// (see dof.ts); F = 1 after e± annihilation.
//
// Cosmic time t(a) = ∫ d ln a / H is tabulated once on a uniform grid in ln a
// and interpolated with cubic Hermite segments in (ln a, ln t), using the exact
// derivative d ln t / d ln a = 1 / (t H). Everything is stored as logarithms so
// that 60 orders of magnitude in t never meet in a subtraction.

import {
  GRAVITATIONAL_CONSTANT,
  MEGAPARSEC,
  NEUTRINO_PHOTON_RATIO,
  SPEED_OF_LIGHT,
  STEFAN_BOLTZMANN,
  gevToKelvin,
} from './constants';
import {
  DOF_T_MAX_GEV,
  constantDofThermalHistory,
  standardModelThermalHistory,
  type ThermalHistory,
} from './dof';
import { compositeGaussLegendre5, gaussLegendre5 } from './integrate';
import { findInterval, hermite, hermiteDerivative } from './interp';
import { PLANCK2018, type CosmologyParams } from './params';
import { ELECTROWEAK_CROSSOVER_GEV, NEUTRON_FREEZE_OUT_GEV, type Tier } from './validity';

export interface CosmologyOptions {
  /** Use Standard Model g*(T) for radiation (default true). */
  readonly standardModelDof?: boolean;
  /** Override Ω_r today (default: photons + Neff massless neutrinos). Ω_Λ adjusts to keep flatness. */
  readonly omegaR?: number;
  /** Grid nodes per unit of ln a (default 128). */
  readonly nodesPerLnA?: number;
  /** ln of the smallest tabulated scale factor (default: top of the g* table). */
  readonly lnAMin?: number;
}

/** Physical values at one instant. SI units. */
export interface PhysicalState {
  /** Scale factor, 1 today. */
  readonly a: number;
  /** Redshift 1/a − 1. */
  readonly z: number;
  /** Photon temperature [K]. */
  readonly temperatureK: number;
  /** Hubble rate [s^-1]. */
  readonly hubble: number;
  /** Hubble radius c/H [m]. */
  readonly hubbleRadius: number;
  /** Proper radius, at that instant, of the region we observe today [m]. */
  readonly observedRegionRadius: number;
}

export type CosmicState =
  | { readonly t: number; readonly tier: 'speculative'; readonly physical: null }
  | { readonly t: number; readonly tier: Exclude<Tier, 'speculative'>; readonly physical: PhysicalState };

export interface Cosmology {
  readonly params: CosmologyParams;
  /** Hubble constant [s^-1]. */
  readonly H0: number;
  readonly omegaGamma: number;
  readonly omegaR: number;
  readonly omegaM: number;
  readonly omegaLambda: number;
  /** Age of the universe today [s]. */
  readonly age: number;
  /** Earliest time covered by the tabulation [s]. */
  readonly tMin: number;
  /** Comoving radius of the observable universe today (particle horizon) [m]. */
  readonly observableRadiusToday: number;
  /** Number of grid nodes. */
  readonly nodeCount: number;

  /** E(a) = H(a)/H0. */
  expansionRate(a: number): number;
  /** H(a) [s^-1]. */
  hubbleAtScaleFactor(a: number): number;
  /** Photon temperature [K] at scale factor a. */
  temperatureAtScaleFactor(a: number): number;
  /** Scale factor at which the photon temperature is T [K]. */
  scaleFactorAtTemperature(temperatureK: number): number;
  /** Radiation density today scaled to a: Ω_r a^-4 F(a). */
  radiationDensity(a: number): number;
  /** Cosmic time [s] at scale factor a ∈ (0, 1]. */
  timeAtScaleFactor(a: number): number;
  /** Scale factor at cosmic time t ∈ [tMin, age] [s]. */
  scaleFactorAtTime(t: number): number;
  timeAtRedshift(z: number): number;
  timeAtTemperature(temperatureK: number): number;
  /** Cosmic time by direct quadrature, bypassing the table (for verification). */
  integrateTime(a: number): number;
  /** Epistemic tier of instant t [s] (see validity.ts). */
  tierAt(t: number): Tier;
  /** Everything the panel needs about instant t [s]. */
  stateAt(t: number): CosmicState;
}

/** Ω_γ for a CMB temperature [K] and H0 [km s^-1 Mpc^-1]. */
export function photonDensityParameter(TCMB0: number, H0: number): number {
  const h0 = (H0 * 1000) / MEGAPARSEC;
  const rhoCrit = (3 * h0 * h0) / (8 * Math.PI * GRAVITATIONAL_CONSTANT);
  const rhoGamma = (4 * STEFAN_BOLTZMANN * Math.pow(TCMB0, 4)) / Math.pow(SPEED_OF_LIGHT, 3);
  return rhoGamma / rhoCrit;
}

const EARLY_TAIL_LN_A = 60;
const EARLY_TAIL_PANELS = 600;
const REL_EPS = 1e-12;

export function createCosmology(
  params: CosmologyParams = PLANCK2018,
  options: CosmologyOptions = {},
): Cosmology {
  const useSmDof = options.standardModelDof ?? true;
  const nodesPerLnA = options.nodesPerLnA ?? 128;
  const thermal: ThermalHistory = useSmDof
    ? standardModelThermalHistory(params.TCMB0)
    : constantDofThermalHistory(params.TCMB0);

  const H0 = (params.H0 * 1000) / MEGAPARSEC;
  const omegaGamma = photonDensityParameter(params.TCMB0, params.H0);
  const omegaR = options.omegaR ?? omegaGamma * (1 + NEUTRINO_PHOTON_RATIO * params.Neff);
  const omegaM = params.omegaM;
  const omegaLambda = 1 - omegaM - omegaR;

  const radiationDensity = (a: number): number =>
    omegaR === 0 ? 0 : (omegaR / (a * a * a * a)) * thermal.radiationFactor(a);
  const expansionRate = (a: number): number =>
    Math.sqrt(radiationDensity(a) + omegaM / (a * a * a) + omegaLambda);
  const hubbleAtScaleFactor = (a: number): number => H0 * expansionRate(a);

  // Integrands in x = ln a.
  const dtdx = (x: number): number => 1 / hubbleAtScaleFactor(Math.exp(x));
  const dchidx = (x: number): number => {
    const a = Math.exp(x);
    return SPEED_OF_LIGHT / (a * hubbleAtScaleFactor(a));
  };

  const defaultLnAMin = Math.floor(
    Math.log(thermal.scaleFactorAtTemperature(gevToKelvin(DOF_T_MAX_GEV))),
  );
  const lnAMin = options.lnAMin ?? defaultLnAMin;

  // Contribution from a = 0 to a_min: integrate a further 60 e-folds down;
  // the integrand falls at least as e^(1.5 x), so the remainder is < e^-90.
  const earlyTail = (f: (x: number) => number, x: number): number =>
    compositeGaussLegendre5(f, x - EARLY_TAIL_LN_A, x, EARLY_TAIL_PANELS);

  const n = Math.max(2, Math.ceil(-lnAMin * nodesPerLnA) + 1);
  const lnA = new Float64Array(n);
  const lnT = new Float64Array(n);
  const slope = new Float64Array(n); // d ln t / d ln a
  for (let i = 0; i < n; i++) lnA[i] = lnAMin * (1 - i / (n - 1));
  lnA[n - 1] = 0;

  let t = earlyTail(dtdx, lnA[0]!);
  let chi = earlyTail(dchidx, lnA[0]!);
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      t += gaussLegendre5(dtdx, lnA[i - 1]!, lnA[i]!);
      chi += gaussLegendre5(dchidx, lnA[i - 1]!, lnA[i]!);
    }
    lnT[i] = Math.log(t);
    slope[i] = 1 / (t * hubbleAtScaleFactor(Math.exp(lnA[i]!)));
  }
  // Read back from the table so that timeAtScaleFactor(1) === age exactly.
  const age = Math.exp(lnT[n - 1]!);
  const tMin = Math.exp(lnT[0]!);
  const observableRadiusToday = chi;

  const integrateTime = (a: number): number => {
    const x = Math.log(a);
    if (x <= lnA[0]!) return earlyTail(dtdx, x);
    const panels = Math.max(1, Math.ceil((x - lnA[0]!) * 64));
    return earlyTail(dtdx, lnA[0]!) + compositeGaussLegendre5(dtdx, lnA[0]!, x, panels);
  };

  const lnTimeAtLnA = (x: number): number => {
    const i = findInterval(lnA, x);
    return hermite(lnA[i]!, lnA[i + 1]!, lnT[i]!, lnT[i + 1]!, slope[i]!, slope[i + 1]!, x);
  };

  const timeAtScaleFactor = (a: number): number => {
    if (!(a > 0) || a > 1 + REL_EPS) throw new RangeError(`scale factor out of range: ${a}`);
    const x = Math.min(0, Math.log(a));
    if (x < lnA[0]!) return integrateTime(a);
    return Math.exp(lnTimeAtLnA(x));
  };

  const scaleFactorAtTime = (time: number): number => {
    if (!(time >= tMin * (1 - REL_EPS)) || time > age * (1 + REL_EPS)) {
      throw new RangeError(`time out of tabulated range: ${time}`);
    }
    const y = Math.min(lnT[n - 1]!, Math.max(lnT[0]!, Math.log(time)));
    const i = findInterval(lnT, y);
    const x0 = lnA[i]!;
    const x1 = lnA[i + 1]!;
    const y0 = lnT[i]!;
    const y1 = lnT[i + 1]!;
    const d0 = slope[i]!;
    const d1 = slope[i + 1]!;
    // Newton on the forward Hermite segment, safeguarded by bisection, so that
    // timeAtScaleFactor(scaleFactorAtTime(t)) == t to rounding.
    let lo = x0;
    let hi = x1;
    let x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    for (let k = 0; k < 60; k++) {
      const g = hermite(x0, x1, y0, y1, d0, d1, x) - y;
      if (g === 0) break;
      if (g < 0) lo = x;
      else hi = x;
      const dg = hermiteDerivative(x0, x1, y0, y1, d0, d1, x);
      let next = x - g / dg;
      if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);
      if (Math.abs(next - x) <= 1e-16 * Math.max(1, Math.abs(x))) {
        x = next;
        break;
      }
      x = next;
    }
    return Math.exp(x);
  };

  const timeAtRedshift = (z: number): number => timeAtScaleFactor(1 / (1 + z));
  const timeAtTemperature = (temperatureK: number): number =>
    timeAtScaleFactor(thermal.scaleFactorAtTemperature(temperatureK));

  // Tier boundaries as times, so that an instant defined by a boundary
  // temperature (e.g. the electroweak crossover) falls on the known side
  // regardless of rounding in the T ↔ t round trip.
  const tElectroweak = timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
  const tFreezeOut = timeAtTemperature(gevToKelvin(NEUTRON_FREEZE_OUT_GEV));
  const tierAt = (time: number): Tier =>
    time < tElectroweak ? 'speculative' : time < tFreezeOut ? 'extrapolated' : 'observed';

  const stateAt = (time: number): CosmicState => {
    const tier = tierAt(time);
    if (tier === 'speculative') return { t: time, tier, physical: null };
    const a = scaleFactorAtTime(time);
    const temperatureK = thermal.temperatureAtScaleFactor(a);
    const hubble = hubbleAtScaleFactor(a);
    return {
      t: time,
      tier,
      physical: {
        a,
        z: 1 / a - 1,
        temperatureK,
        hubble,
        hubbleRadius: SPEED_OF_LIGHT / hubble,
        observedRegionRadius: a * observableRadiusToday,
      },
    };
  };

  return {
    params,
    H0,
    omegaGamma,
    omegaR,
    omegaM,
    omegaLambda,
    age,
    tMin,
    observableRadiusToday,
    nodeCount: n,
    expansionRate,
    hubbleAtScaleFactor,
    temperatureAtScaleFactor: thermal.temperatureAtScaleFactor,
    scaleFactorAtTemperature: thermal.scaleFactorAtTemperature,
    radiationDensity,
    timeAtScaleFactor,
    scaleFactorAtTime,
    timeAtRedshift,
    timeAtTemperature,
    integrateTime,
    tierAt,
    stateAt,
  };
}
