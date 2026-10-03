// The only place where physical data become visual parameters, and the
// register of every declared visual licence.
//
// The licence line in the interface is generated from VISUAL_LICENCES, so an
// interpretation cannot reach the screen without being declared there. Each
// licence also has an entry in docs/licencias-visuales.md and its texts in
// i18n (`licences.<id>`), both checked by tests.
//
// Everything here is pure: no three.js, no DOM. The scene (scene.ts) only
// draws what visualState() returns, and every value it returns is either
// normalised to [0, 1] or a small dimensionless number, never a, t, T or z.

import {
  DRAPER_POINT_K,
  ELECTROWEAK_CROSSOVER_GEV,
  PLANCK2018,
  PLANCK2018_DERIVED,
  gevToKelvin,
  type Cosmology,
} from '../physics';
import { createGrowthFactor } from '../physics/growth';
import type { ResolvedEpoch } from '../timeline';
import { blackbodySrgb, type Triple } from './blackbody';

export type LicenceId =
  | 'controlScale'
  | 'colour'
  | 'brightness'
  | 'haze'
  | 'plasma'
  | 'cmbContrast'
  | 'separation'
  | 'motion'
  | 'structure'
  | 'density'
  | 'peaks'
  | 'galaxySize'
  | 'camera'
  | 'transitions'
  | 'grading';

export const VISUAL_LICENCES: readonly LicenceId[] = [
  'controlScale',
  'colour',
  'brightness',
  'haze',
  'plasma',
  'cmbContrast',
  'separation',
  'motion',
  'structure',
  'density',
  'peaks',
  'galaxySize',
  'camera',
  'transitions',
  'grading',
];

// ---------------------------------------------------------------------------
// Licence parameters. Each constant below is a choice, not a datum; its
// licence id is named next to it and the licence text quotes it.

/** colour: above this temperature [K] the visible hue no longer changes (Rayleigh-Jeans limit). */
export const COLOUR_SATURATION_K = 1e6;

/** colour: hue of the speculative tier, the same violet the panel uses for it. */
export const SPECULATIVE_COLOUR: Triple = [0.725, 0.651, 0.851];

/** brightness: the glow fades in between the Draper point and this temperature [K]. */
export const GLOW_FULL_FROM_K = 2970;
/** brightness: glow at GLOW_FULL_FROM_K; it rises logarithmically to 1 at GLOW_MAX_K. */
export const GLOW_AT_FULL = 0.55;
export const GLOW_MAX_K = 1e12;
/** brightness: faint grey of the gas once the universe is transparent (dark ages and after). */
export const GAS_LEVEL = 0.32;
/** brightness and haze of the speculative tier, where the model gives no temperature. */
export const SPECULATIVE_GLOW = 0.35;
export const SPECULATIVE_HAZE = 0.8;

/** haze: after last scattering the fog clears over this factor in 1 + z. */
export const HAZE_CLEARING_FACTOR = 1.5;

/** structure: stars switch on over this factor in time after the first-stars anchor. */
export const STARS_RAMP_FACTOR = 3;

/** density: number of particles (128³ desktop, 64³ mobile). */
export const PARTICLES_DESKTOP = 2_097_152;
export const PARTICLES_MOBILE = 262_144;

/** transitions: duration of a step between instants [s], with ease-in-out. */
export const TRANSITION_SECONDS = 1.75;

/** motion: after a step, the field keeps drifting apart for this long [s]. */
export const DRIFT_SECONDS = 3;

// ---------------------------------------------------------------------------

/** What the scene draws at an instant. All values are normalised or dimensionless. */
export interface VisualState {
  /** Speculative tier: no model values, an abstract field. */
  readonly speculative: boolean;
  /** sRGB hue of the light, brightest channel 1. */
  readonly colour: Triple;
  /** Brightness of the radiation, 0 (invisible, below the Draper point) to 1. */
  readonly glow: number;
  /** Opacity of the fog: 1 while the universe is opaque, 0 once transparent. */
  readonly haze: number;
  /** Faint grey of the gas, 0 or GAS_LEVEL. */
  readonly gas: number;
  /** ln a normalised to [0, 1] between the first instant with model values and today. */
  readonly separation: number;
  /** H·t: how fast distances grow, per unit of the age of the universe (≈ 0.5–1). */
  readonly expansion: number;
  /** How far matter has gathered into filaments and galaxies, 0 to 1. */
  readonly structure: number;
  /** How many stars shine, 0 to 1. */
  readonly stars: number;

  // Visual parameters for the 5-regime scene architecture:
  readonly intensity: number;
  readonly turbulence: number;
  readonly contrastGain: number;
  readonly cmbHot: Triple;
  readonly cmbCold: Triple;
  readonly cmbLevel: number;
  readonly gasLevel: number;
  readonly halo: number;
  readonly growthD: number;
  readonly bloomStrength: number;
  readonly bloomThreshold: number;
  readonly dFirstStars: number;
  readonly galaxiesVisible: number;
}

export interface VisualMap {
  visualState(t: number): VisualState;
  /** How many times distances grow from the first instant with model values to today (1/a). */
  readonly growth: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export function createVisualMap(cosmology: Cosmology, epochs: readonly ResolvedEpoch[]): VisualMap {
  const lnAStart = Math.log(
    cosmology.scaleFactorAtTime(cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV))),
  );
  const zStar = PLANCK2018_DERIVED.zStar.value;
  const firstStars = epochs.find((e) => e.id === 'firstStars');
  if (!firstStars) throw new Error('visualMap: no first-stars epoch');
  const tStars = firstStars.anchor;
  const lnStarsToToday = Math.log(cosmology.age / tStars);

  const growthFactor = createGrowthFactor(PLANCK2018.omegaM);
  const pStars = cosmology.stateAt(tStars).physical;
  const dFirstStars = pStars ? growthFactor(pStars.a) : 0.04;

  return {
    growth: Math.exp(-lnAStart),
    visualState(t) {
      const state = cosmology.stateAt(t);
      if (state.physical === null) {
        return {
          speculative: true,
          colour: SPECULATIVE_COLOUR,
          glow: SPECULATIVE_GLOW,
          haze: SPECULATIVE_HAZE,
          gas: 0,
          separation: 0,
          expansion: 0,
          structure: 0,
          stars: 0,
          intensity: SPECULATIVE_GLOW,
          turbulence: 0,
          contrastGain: 1,
          cmbHot: SPECULATIVE_COLOUR,
          cmbCold: SPECULATIVE_COLOUR,
          cmbLevel: 0,
          gasLevel: 0,
          halo: 0,
          growthD: 0,
          bloomStrength: 0.8,
          bloomThreshold: 0.6,
          dFirstStars,
          galaxiesVisible: 0,
        };
      }
      const p = state.physical;
      const T = p.temperatureK;
      const lnT = Math.log(T);
      const D = growthFactor(p.a);

      // Below the Draper point a black body does not glow visibly.
      const visible = smoothstep((lnT - Math.log(DRAPER_POINT_K)) / Math.log(GLOW_FULL_FROM_K / DRAPER_POINT_K));
      const level = GLOW_AT_FULL + (1 - GLOW_AT_FULL) * clamp01(Math.log(T / GLOW_FULL_FROM_K) / Math.log(GLOW_MAX_K / GLOW_FULL_FROM_K));

      // Opaque until last scattering (z*), then the fog clears.
      const haze = p.z >= zStar ? 1 : 1 - smoothstep(Math.log((1 + zStar) / (1 + p.z)) / Math.log(HAZE_CLEARING_FACTOR));

      const intensity = visible * (0.3 + 0.025 * Math.max(0, Math.log10(T / 3000)));
      const log10T = Math.log10(T);
      const turbulence = clamp01((log10T - 3.4) / 12);
      const contrastGain = 1 + 7 * (1 - smoothstep((D - 0.05) / 0.25));

      const cmbHot = blackbodySrgb(Math.min(Math.max(T * 1.3, DRAPER_POINT_K), COLOUR_SATURATION_K));
      const cmbCold = blackbodySrgb(Math.min(Math.max(T * 0.75, DRAPER_POINT_K), COLOUR_SATURATION_K));
      const cmbLevel = 3 * intensity * (1 - haze);

      const lateness = smoothstep(Math.log(Math.max(D, 1e-4) / 0.05) / Math.log(1 / 0.05));
      const gasLevel = (2 - 1.55 * lateness) * (haze >= 0.3 ? 0 : 1 - haze / 0.3) * (D < 0.03 ? 2.5 : 1.6 - 0.6 * smoothstep((D - 0.05) / 0.5));
      const halo = 0.6 - 0.25 * lateness;

      const bloomStrength = haze > 0.5 ? 0.9 : haze > 0.05 ? 0.6 : 0.5 - 0.2 * lateness;
      const bloomThreshold = haze > 0.5 ? 0.55 : haze > 0.05 ? 0.7 : 0.8;
      const galaxiesVisible = haze < 0.5 ? 1 : 0;

      const sinceStars = t <= tStars ? 0 : Math.log(t / tStars);
      return {
        speculative: false,
        // Below the Draper point the glow is zero, and the colour-matching fit
        // tails give meaningless hues there, so the hue is held at its value
        // at the Draper point.
        colour: blackbodySrgb(Math.min(Math.max(T, DRAPER_POINT_K), COLOUR_SATURATION_K)),
        glow: visible * level,
        haze,
        gas: haze < 1 ? GAS_LEVEL * (1 - haze) : 0,
        separation: clamp01(1 - Math.log(p.a) / lnAStart),
        expansion: p.hubble * t,
        structure: clamp01(sinceStars / lnStarsToToday),
        stars: smoothstep(sinceStars / Math.log(STARS_RAMP_FACTOR)),
        intensity,
        turbulence,
        contrastGain,
        cmbHot,
        cmbCold,
        cmbLevel,
        gasLevel,
        halo,
        growthD: D,
        bloomStrength,
        bloomThreshold,
        dFirstStars,
        galaxiesVisible,
      };
    },
  };
}
