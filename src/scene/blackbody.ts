// The colour of a black body at temperature T, as the eye would see it.
//
// Pure colorimetry, no three.js: Planck's law weighted by the CIE 1931 2°
// colour-matching functions gives the tristimulus XYZ; the chromaticity (x, y)
// and an sRGB colour follow. The scene's colour licence (visualMap.ts) decides
// how this colour is used; the colour itself is computed, not chosen.
//
// Sources (docs/fuentes.md): CIE 015:2018 for the colour-matching functions,
// in the analytic fit of Wyman, Sloan & Shirley 2013; the XYZ → sRGB matrix
// and transfer function of IEC 61966-2-1, as written in CSS Color 4.

import { SECOND_RADIATION_CONSTANT } from '../physics';

export type Triple = readonly [number, number, number];

/** One lobe of the piecewise Gaussian fit: α exp(−½ [(λ−β) (λ<β ? γ : δ)]²). */
const lobe = (nm: number, alpha: number, beta: number, gamma: number, delta: number): number => {
  const t = (nm - beta) * (nm < beta ? gamma : delta);
  return alpha * Math.exp(-0.5 * t * t);
};

/**
 * CIE 1931 2° colour-matching functions x̄, ȳ, z̄ at a wavelength in nm, in the
 * multi-lobe fit of Wyman, Sloan & Shirley 2013 (JCGT 2(2), Table 1).
 */
export function colourMatching(nm: number): Triple {
  return [
    lobe(nm, 0.362, 442.0, 0.0624, 0.0374) + lobe(nm, 1.056, 599.8, 0.0264, 0.0323) + lobe(nm, -0.065, 501.1, 0.049, 0.0382),
    lobe(nm, 0.821, 568.8, 0.0213, 0.0247) + lobe(nm, 0.286, 530.9, 0.0613, 0.0322),
    lobe(nm, 1.217, 437.0, 0.0845, 0.0278) + lobe(nm, 0.681, 459.0, 0.0385, 0.0725),
  ];
}

/** Visible range and step of the integration [nm]. */
const NM_MIN = 360;
const NM_MAX = 830;
const NM_STEP = 1;

/** ln(eˣ − 1) without overflow for large x nor loss of precision for small x. */
const logExpm1 = (x: number): number => (x > 30 ? x + Math.log1p(-Math.exp(-x)) : Math.log(Math.expm1(x)));

/**
 * Tristimulus XYZ of a black body at T [K], up to a constant factor:
 * Σ B_λ(T) (x̄, ȳ, z̄) Δλ with B_λ ∝ λ⁻⁵ / (exp(c₂/λT) − 1). The spectrum is
 * summed in logarithms relative to its largest visible value, so the sum stays
 * finite from the microwave background (2.7 K) to the hottest instants
 * (10¹⁵ K). Only ratios are meaningful; the overall scale is arbitrary.
 */
export function blackbodyXYZ(kelvin: number): Triple {
  const logRadiance: number[] = [];
  for (let nm = NM_MIN; nm <= NM_MAX; nm += NM_STEP) {
    // λ in µm keeps λ⁻⁵ of order one.
    logRadiance.push(-5 * Math.log(nm / 1000) - logExpm1(SECOND_RADIATION_CONSTANT / (nm * 1e-9 * kelvin)));
  }
  const peak = Math.max(...logRadiance);
  let X = 0;
  let Y = 0;
  let Z = 0;
  logRadiance.forEach((log, i) => {
    const radiance = Math.exp(log - peak);
    const [x, y, z] = colourMatching(NM_MIN + i * NM_STEP);
    X += radiance * x;
    Y += radiance * y;
    Z += radiance * z;
  });
  return [X, Y, Z];
}

/** CIE 1931 chromaticity (x, y) of a black body at T [K]. */
export function blackbodyChromaticity(kelvin: number): { readonly x: number; readonly y: number } {
  const [X, Y, Z] = blackbodyXYZ(kelvin);
  const sum = X + Y + Z;
  return { x: X / sum, y: Y / sum };
}

/** XYZ (D65) → linear sRGB (IEC 61966-2-1, exact rational form of CSS Color 4). */
const XYZ_TO_LINEAR_SRGB: readonly Triple[] = [
  [12831 / 3959, -329 / 214, -1974 / 3959],
  [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
  [705 / 12673, -2585 / 12673, 705 / 667],
];

/** sRGB transfer function (IEC 61966-2-1). */
const encodeSrgb = (linear: number): number =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;

/**
 * The hue of a black body at T [K] as an sRGB colour with its brightest
 * channel at 1: only the colour, not the brightness. Below ~1900 K the
 * black-body locus leaves the sRGB gamut; out-of-gamut channels are clipped
 * at 0, the closest colour a screen can show.
 */
export function blackbodySrgb(kelvin: number): Triple {
  const xyz = blackbodyXYZ(kelvin);
  const linear = XYZ_TO_LINEAR_SRGB.map((row) => Math.max(0, row[0]! * xyz[0] + row[1]! * xyz[1] + row[2]! * xyz[2]));
  const peak = Math.max(...linear);
  return [encodeSrgb(linear[0]! / peak), encodeSrgb(linear[1]! / peak), encodeSrgb(linear[2]! / peak)];
}
