// The figures quoted in the licence line, taken from the constants that
// implement each licence, so that the text and the scene cannot disagree.

import type { Locale, Messages } from '../i18n';
import { DRAPER_POINT_K, PLANCK2018_DERIVED } from '../physics';
import { DEFAULT_EQUAL_SHARE } from '../timeline';
import {
  COLOUR_SATURATION_K,
  DRIFT_SECONDS,
  PARTICLES_DESKTOP,
  PARTICLES_MOBILE,
  TRANSITION_SECONDS,
  type LicenceId,
} from '../scene/visualMap';
import { formatCelsius, formatCount, formatDuration, formatNumber, formatPercent } from './format';

export type LicenceVars = Readonly<Record<LicenceId, Readonly<Record<string, string>>>>;

/** `growth`: how many times distances grow over the scene's range (VisualMap.growth). */
export function licenceVars(locale: Locale, m: Messages, growth: number): LicenceVars {
  const count = (x: number): string => formatCount(x, locale, m.units);
  return {
    controlScale: { equalShare: formatPercent(DEFAULT_EQUAL_SHARE, locale) },
    colour: { saturation: count(COLOUR_SATURATION_K) },
    brightness: { draper: formatNumber(DRAPER_POINT_K, locale), celsius: formatCelsius(DRAPER_POINT_K, locale) },
    haze: { zStar: formatNumber(PLANCK2018_DERIVED.zStar.value, locale) },
    plasma: {},
    cmbContrast: {},
    separation: { range: count(growth) },
    motion: { drift: formatDuration(DRIFT_SECONDS, locale, m.units) },
    structure: {},
    density: { desktop: formatNumber(PARTICLES_DESKTOP, locale), mobile: formatNumber(PARTICLES_MOBILE, locale) },
    peaks: {},
    galaxySize: {},
    camera: {},
    transitions: { duration: formatDuration(TRANSITION_SECONDS, locale, m.units) },
    grading: {},
    milkyWayPin: {},
  };
}
