// Physical constants and units (SI unless stated otherwise).
// Sources: CODATA 2018 (Tiesinga et al. 2021, Rev. Mod. Phys. 93, 025010);
// IAU 2012 Resolution B2 (astronomical unit) and IAU 2015 Resolution B2 (parsec);
// the Julian year (365.25 d) as used by the IAU for light-years.

/** Speed of light in vacuum [m s^-1] (exact). */
export const SPEED_OF_LIGHT = 299_792_458;

/** Newtonian constant of gravitation [m^3 kg^-1 s^-2] (CODATA 2018). */
export const GRAVITATIONAL_CONSTANT = 6.6743e-11;

/** Stefan–Boltzmann constant [W m^-2 K^-4] (CODATA 2018, exact in the 2019 SI). */
export const STEFAN_BOLTZMANN = 5.670374419e-8;

/** Boltzmann constant [GeV K^-1] (CODATA 2018, exact in the 2019 SI). */
export const BOLTZMANN_GEV_PER_K = 8.617333262e-14;

/** Planck time [s] (CODATA 2018). */
export const PLANCK_TIME = 5.391247e-44;

/** Astronomical unit [m] (IAU 2012, exact). */
export const ASTRONOMICAL_UNIT = 149_597_870_700;

/** Parsec [m] (IAU 2015: 648000/π au). */
export const PARSEC = (648_000 / Math.PI) * ASTRONOMICAL_UNIT;

/** Megaparsec [m]. */
export const MEGAPARSEC = 1e6 * PARSEC;

/** Julian year [s]. */
export const JULIAN_YEAR = 365.25 * 86_400;

/** Light-year [m] (Julian year × c). */
export const LIGHT_YEAR = JULIAN_YEAR * SPEED_OF_LIGHT;

/** Gigayear [s]. */
export const GYR = 1e9 * JULIAN_YEAR;

/**
 * Neutrino-to-photon energy density ratio per effective species after e± annihilation:
 * (7/8) (4/11)^(4/3).
 */
export const NEUTRINO_PHOTON_RATIO = (7 / 8) * Math.pow(4 / 11, 4 / 3);

/** Kelvin → GeV. */
export function kelvinToGeV(kelvin: number): number {
  return kelvin * BOLTZMANN_GEV_PER_K;
}

/** GeV → Kelvin. */
export function gevToKelvin(gev: number): number {
  return gev / BOLTZMANN_GEV_PER_K;
}
