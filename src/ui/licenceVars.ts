// The figures quoted in the licence line, taken from the constants that
// implement each licence, so that the text and the scene cannot disagree.

import type { Locale, Messages } from '../i18n';
import { DRAPER_POINT_K, PLANCK2018_DERIVED } from '../physics';
import { DEFAULT_EQUAL_SHARE } from '../timeline';
import {
  COLOUR_SATURATION_K,
  DRIFT_SECONDS,
  TRANSITION_SECONDS,
  type LicenceId,
} from '../scene/visualMap';
import { formatCelsius, formatCount, formatDuration, formatNumber, formatPercent } from './format';
import { budgetFor, profileFromSearch } from '../scene/renderQuality';

export type LicenceVars = Readonly<Record<LicenceId, Readonly<Record<string, string>>>>;

/** `growth`: how many times distances grow over the scene's range (VisualMap.growth). */
export function licenceVars(locale: Locale, m: Messages, growth: number): LicenceVars {
  const count = (x: number): string => formatCount(x, locale, m.units);
  // These figures match the actual selected GPU profiles, including ?quality=high.
  const search = typeof location === 'undefined' ? '' : location.search;
  const desktopParticles = budgetFor(profileFromSearch(search, false)).n ** 3;
  const mobileParticles = budgetFor(profileFromSearch(search, true)).n ** 3;
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
    density: { desktop: formatNumber(desktopParticles, locale), mobile: formatNumber(mobileParticles, locale) },
    peaks: {},
    galaxySize: {},
    camera: {},
    transitions: { duration: formatDuration(TRANSITION_SECONDS, locale, m.units) },
    grading: {},
    milkyWayPin: {},
  };
}
