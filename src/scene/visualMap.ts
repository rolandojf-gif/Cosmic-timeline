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
  | 'grading'
  | 'milkyWayPin';

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
  'milkyWayPin',
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

/** plasma: hue of the cold, stretched inflationary vacuum (dark indigo). */
export const INFLATION_COLOUR: Triple = [0.38, 0.32, 0.6];
/** plasma: hue of the reheating peak, a near-white incandescence. */
export const REHEAT_COLOUR: Triple = [1.0, 0.97, 0.9];
/** plasma: the reheating flash peaks between these log10 t [s] (illustrative). */
export const REHEAT_PEAK_FROM = -30.5;
export const REHEAT_PEAK_TO = -29.5;
/** plasma: brightness and bloom at the reheating peak. */
export const REHEAT_PEAK_INTENSITY = 1.25;
export const REHEAT_PEAK_BLOOM = 1.15;
/** plasma: emission gain of the deconfined quark plasma. */
export const QUARK_EMIT = 3.6;

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
  readonly emit: number;
  readonly stretch: number;
  readonly clump: number;
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
const mixTriple = (a: Triple, b: Triple, f: number): Triple => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
  a[2] + (b[2] - a[2]) * f,
];

export function createVisualMap(cosmology: Cosmology, epochs: readonly ResolvedEpoch[]): VisualMap {
  const tEW = cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
  const lgEW = Math.log10(tEW);
  const lnAStart = Math.log(
    cosmology.scaleFactorAtTime(tEW),
  );
  // State of the quark plasma at the electroweak crossover (same formulas as
  // below), so the reheating cool-down ends on it without a jump.
  const log10TEW = Math.log10(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
  const quarkIntensity = 0.3 + 0.025 * Math.max(0, log10TEW - Math.log10(3000));
  const quarkTurbulence = clamp01((log10TEW - 3.4) / 12);
  const quarkBloom = 0.95;
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
        const lg = Math.log10(Math.max(t, 1e-45));
        let colour: Triple = SPECULATIVE_COLOUR;
        let intensity = SPECULATIVE_GLOW;
        let turbulence = 0;
        let haze = SPECULATIVE_HAZE;
        let emit = 2.5;
        let cmbLevel = 0;
        let cmbHot: Triple = SPECULATIVE_COLOUR;
        let cmbCold: Triple = SPECULATIVE_COLOUR;
        let bloomStrength = 0.8;
        let bloomThreshold = 0.6;
        let stretch = 0;
        let clump = 0;

        if (lg <= -36.0) {
          // Planck era, quantum foam: a dim violet medium with fast, fine
          // shimmering ripples. Fades into the start of inflation at lg = -36.
          const k = smoothstep((lg + 40) / 4);
          turbulence = 0.85 - 0.80 * k;
          intensity = 0.40 - 0.22 * k;
          haze = 0.75 - 0.55 * k;
          emit = 2.4 - 2.05 * k;
          cmbLevel = 0.30 * (1 - k);
          cmbHot = [0.80, 0.55, 1.00];
          cmbCold = [0.30, 0.18, 0.60];
          bloomStrength = 0.70 - 0.40 * k;
          bloomThreshold = 0.60 + 0.15 * k;
          colour = SPECULATIVE_COLOUR;
          stretch = 0;
        } else if (lg <= -32.0) {
          // Inflation: exponential metric stretching flattens the foam into
          // long hyperluminal vacuum streaks, supercooling into a dark indigo void.
          const s = smoothstep((lg + 36.0) / 4.0);
          turbulence = 0.05 - 0.02 * s;
          intensity = 0.18 - 0.03 * s;
          haze = 0.20 - 0.04 * s;
          emit = 0.35 - 0.10 * s;
          cmbLevel = 0;
          bloomStrength = 0.30;
          bloomThreshold = 0.75;
          colour = mixTriple(SPECULATIVE_COLOUR, INFLATION_COLOUR, s);
          stretch = 0.3 + 0.7 * s;
        } else {
          stretch = Math.max(0, 1 - (lg + 32.0) / 2.5);
          // Reheating, the hot Big Bang: the inflaton decays and fills all of
          // space at once with hot plasma. No centre, no outside: the whole
          // field ignites. A brief peak, then it cools into the quark plasma
          // and ends exactly on its state at the electroweak crossover.
          const quarkColour = blackbodySrgb(COLOUR_SATURATION_K);
          if (lg < REHEAT_PEAK_FROM) {
            const r = smoothstep((lg + 32.0) / (REHEAT_PEAK_FROM + 32.0));
            intensity = 0.15 + (REHEAT_PEAK_INTENSITY - 0.15) * r;
            colour = mixTriple(INFLATION_COLOUR, REHEAT_COLOUR, r);
            bloomStrength = 0.30 + (REHEAT_PEAK_BLOOM - 0.30) * r;
            bloomThreshold = 0.75 - 0.25 * r;
            turbulence = 0.03 + 0.97 * r;
            emit = 0.25 + (QUARK_EMIT - 0.25) * r;
            haze = 0.16 + 0.84 * r;
          } else if (lg < REHEAT_PEAK_TO) {
            intensity = REHEAT_PEAK_INTENSITY;
            colour = REHEAT_COLOUR;
            bloomStrength = REHEAT_PEAK_BLOOM;
            bloomThreshold = 0.5;
            turbulence = 1;
            emit = QUARK_EMIT;
            haze = 1;
          } else {
            // Most of the decay happens early, so the long run up to the
            // electroweak crossover reads as the plasma, not as the flash.
            const x = clamp01((lg - REHEAT_PEAK_TO) / (lgEW - REHEAT_PEAK_TO));
            const cool = 1 - (1 - x) ** 3;
            intensity = REHEAT_PEAK_INTENSITY + (quarkIntensity - REHEAT_PEAK_INTENSITY) * cool;
            colour = mixTriple(REHEAT_COLOUR, quarkColour, cool);
            bloomStrength = REHEAT_PEAK_BLOOM + (quarkBloom - REHEAT_PEAK_BLOOM) * cool;
            bloomThreshold = 0.5 + 0.05 * cool;
            turbulence = 1 - (1 - quarkTurbulence) * cool;
            emit = QUARK_EMIT;
            haze = 1;
          }
        }

        return {
          speculative: true,
          colour,
          glow: intensity,
          haze,
          gas: 0,
          separation: 0,
          expansion: 0,
          structure: 0,
          stars: 0,
          intensity,
          turbulence,
          contrastGain: 1,
          cmbHot,
          cmbCold,
          cmbLevel,
          gasLevel: 0,
          halo: 0,
          growthD: 0,
          bloomStrength,
          bloomThreshold,
          dFirstStars,
          galaxiesVisible: 0,
          emit,
          stretch,
          clump,
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

      // plasma licence: the QCD crossover (T ≈ 155 MeV, log10 T ≈ 12.25) is the
      // visible boundary between quarks and hadrons. Above it the deconfined
      // plasma is finer, more agitated and brighter; below it (confinement and
      // annihilation) the fluid calms. `hadronEra` limits the calming to the
      // hadron epoch, so nucleosynthesis keeps its approved look.
      const qcdFactor = smoothstep((log10T - 11.5) / 2.0);
      const hadronEra = (1 - qcdFactor) * smoothstep((log10T - 9.5) / 1.5);
      const baseTurbulence = clamp01((log10T - 3.4) / 12);
      const turbulence = clamp01(baseTurbulence * (1 - 0.4 * hadronEra));
      const emit = 3.0 + 0.6 * qcdFactor - 0.8 * hadronEra;
      const contrastGain = 1 + 7 * (1 - smoothstep((D - 0.05) / 0.25));

      const cmbHot = blackbodySrgb(Math.min(Math.max(T * 1.3, DRAPER_POINT_K), COLOUR_SATURATION_K));
      const cmbCold = blackbodySrgb(Math.min(Math.max(T * 0.75, DRAPER_POINT_K), COLOUR_SATURATION_K));
      const cmbLevel = 3 * intensity * (1 - haze);

      const lateness = smoothstep(Math.log(Math.max(D, 1e-4) / 0.05) / Math.log(1 / 0.05));
      const gasLevel = (2 - 1.55 * lateness) * (haze >= 0.3 ? 0 : 1 - haze / 0.3) * (D < 0.03 ? 2.5 : 1.6 - 0.6 * smoothstep((D - 0.05) / 0.5));
      const halo = 0.6 - 0.25 * lateness;

      const bloomStrength = haze > 0.5
        ? 0.9 + 0.05 * qcdFactor - 0.12 * hadronEra
        : haze > 0.05
          ? 0.6
          : 0.5 - 0.2 * lateness;
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
        emit,
        stretch: 0,
        clump: hadronEra,
      };
    },
  };
}
