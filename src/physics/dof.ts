// Standard Model degrees of freedom and the temperature–scale-factor relation.
//
// Entropy conservation fixes g*s(T) T^3 a^3 = constant, so
//   a(T) = (T0 / T) (g*s0 / g*s(T))^(1/3).
// The radiation energy density relative to its naive a^-4 scaling is
//   ρ_r(a) / (ρ_r0 a^-4) = (g*ρ(T) / g*ρ0) (g*s0 / g*s(T))^(4/3).
// Below the table (T < 10 keV) both g* are constant and T = T0 / a exactly.
// Above it (T > 1.5e6 GeV) they are held at the last tabulated value; that
// regime is outside the model's stated validity anyway (see validity.ts).

import { DOF_GRHO, DOF_GS, DOF_T_GEV } from './data/dofTable';
import { Pchip } from './interp';
import { BOLTZMANN_GEV_PER_K, gevToKelvin, kelvinToGeV } from './constants';

const LN_K_GEV = Math.log(BOLTZMANN_GEV_PER_K);
const lnT = DOF_T_GEV.map(Math.log);
const gsInterp = new Pchip(lnT, DOF_GS);
const grhoInterp = new Pchip(lnT, DOF_GRHO);

/** g*s at the low-temperature end of the table (today's value). */
export const GS_TODAY = DOF_GS[0]!;
/** g*ρ at the low-temperature end of the table (today's value). */
export const GRHO_TODAY = DOF_GRHO[0]!;
/** Highest tabulated temperature [GeV]. */
export const DOF_T_MAX_GEV = DOF_T_GEV[DOF_T_GEV.length - 1]!;

const DOF_T_MIN_K = gevToKelvin(DOF_T_GEV[0]!);
const LN_GS_TODAY_THIRD = Math.log(GS_TODAY) / 3;

/** g*s at photon temperature T [GeV]. */
export function gStarS(tGeV: number): number {
  return gsInterp.evaluate(Math.log(tGeV));
}

/** g*ρ at photon temperature T [GeV]. */
export function gStarRho(tGeV: number): number {
  return grhoInterp.evaluate(Math.log(tGeV));
}

/** Thermal history for a given CMB temperature today. */
export interface ThermalHistory {
  /** Scale factor at which the photon temperature equals T [K]. */
  scaleFactorAtTemperature(temperatureK: number): number;
  /** Photon temperature [K] at scale factor a. */
  temperatureAtScaleFactor(a: number): number;
  /** ρ_r(a) / (ρ_r0 a^-4): 1 at late times, < 1 before e± annihilation. */
  radiationFactor(a: number): number;
}

/** Thermal history with Standard Model degrees of freedom. */
export function standardModelThermalHistory(TCMB0: number): ThermalHistory {
  const scaleFactorAtTemperature = (temperatureK: number): number =>
    (TCMB0 / temperatureK) * Math.cbrt(GS_TODAY / gStarS(kelvinToGeV(temperatureK)));

  const solveLnTAndGs = (a: number): { lnTempK: number; gs: number } | null => {
    // Below the table g*s is constant, so T = T0/a exactly.
    if (TCMB0 / a <= DOF_T_MIN_K) return null;
    // Solve F(u) = u + ln g*s(e^u)/3 - ln(T0 g*s0^(1/3) / a) = 0 for u = ln T.
    // F is strictly increasing (d ln g*s / d ln T > -0.01 in the table), so
    // the root is unique; the secant method converges in a few steps.
    const lnTNaive = Math.log(TCMB0 / a);
    const target = lnTNaive + LN_GS_TODAY_THIRD;
    let u0 = lnTNaive;
    let gs0 = gsInterp.evaluate(u0 + LN_K_GEV);
    let f0 = u0 + Math.log(gs0) / 3 - target;
    let u1 = u0 - f0;
    let gs1 = gsInterp.evaluate(u1 + LN_K_GEV);
    let f1 = u1 + Math.log(gs1) / 3 - target;
    for (let k = 0; k < 60 && f1 !== 0; k++) {
      const slope = (f1 - f0) / (u1 - u0);
      const u2 = slope > 0 && Number.isFinite(slope) ? u1 - f1 / slope : u1 - f1;
      u0 = u1;
      f0 = f1;
      u1 = u2;
      gs1 = gsInterp.evaluate(u1 + LN_K_GEV);
      f1 = u1 + Math.log(gs1) / 3 - target;
      if (Math.abs(u1 - u0) <= 1e-15 * Math.max(1, Math.abs(u1))) break;
    }
    return { lnTempK: u1, gs: gs1 };
  };

  const temperatureAtScaleFactor = (a: number): number => {
    const solved = solveLnTAndGs(a);
    return solved === null ? TCMB0 / a : Math.exp(solved.lnTempK);
  };

  const radiationFactor = (a: number): number => {
    const solved = solveLnTAndGs(a);
    if (solved === null) return 1;
    const grho = grhoInterp.evaluate(solved.lnTempK + LN_K_GEV);
    return (grho / GRHO_TODAY) * Math.pow(GS_TODAY / solved.gs, 4 / 3);
  };

  return { scaleFactorAtTemperature, temperatureAtScaleFactor, radiationFactor };
}

/** Thermal history with constant degrees of freedom (T = T0/a). Used for analytic tests. */
export function constantDofThermalHistory(TCMB0: number): ThermalHistory {
  return {
    scaleFactorAtTemperature: (temperatureK) => TCMB0 / temperatureK,
    temperatureAtScaleFactor: (a) => TCMB0 / a,
    radiationFactor: () => 1,
  };
}
