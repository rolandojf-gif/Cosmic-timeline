// Numbers, units and significant figures for the interface.
//
// Every value is shown with three significant figures: the model reproduces the
// published values to better than 1% (tests/physics/fidelity.test.ts), so a
// fourth figure would claim a precision the data do not have.

import { fill, type Locale, type Messages, type Plural } from '../i18n';
import {
  ASTRONOMICAL_UNIT,
  BOLTZMANN_GEV_PER_K,
  CELSIUS_ZERO_K,
  JULIAN_YEAR,
  LIGHT_YEAR,
  MEGAPARSEC,
} from '../physics';

export const SIGNIFICANT_DIGITS = 3;

type Units = Messages['units'];

/** Plain notation inside [PLAIN_MIN, PLAIN_MAX); scientific outside. */
const PLAIN_MIN = 1e-3;
const PLAIN_MAX = 1e6;

const numberFormats = new Map<string, Intl.NumberFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

function numberFormat(locale: Locale, digits: number): Intl.NumberFormat {
  const key = `${locale}:${digits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { maximumSignificantDigits: digits });
    numberFormats.set(key, format);
  }
  return format;
}

function pluralRule(locale: Locale, digits: number): Intl.PluralRules {
  const key = `${locale}:${digits}`;
  let rules = pluralRules.get(key);
  if (!rules) {
    rules = new Intl.PluralRules(locale, { maximumSignificantDigits: digits });
    pluralRules.set(key, rules);
  }
  return rules;
}

/** x rounded to `digits` significant figures. */
export function roundSignificant(x: number, digits: number = SIGNIFICANT_DIGITS): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  const decimals = digits - 1 - exponent;
  // Scale by a power of ten on whichever side keeps the factor finite.
  return decimals >= 0
    ? Math.round(x * 10 ** decimals) / 10 ** decimals
    : Math.round(x / 10 ** -decimals) * 10 ** -decimals;
}

const SUPERSCRIPTS: Readonly<Record<string, string>> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

const superscript = (n: number): string => [...String(n)].map((c) => SUPERSCRIPTS[c] ?? c).join('');

/** An exact power of ten, language-neutral: "10⁻⁴⁰", "1", "10¹⁰". */
export function formatPowerOfTen(exponent: number): string {
  return exponent === 0 ? '1' : `10${superscript(exponent)}`;
}

/** Scientific notation: "9,4 × 10⁻¹²" (es), "9.4 × 10⁻¹²" (en). */
export function formatScientific(x: number, locale: Locale, digits: number = SIGNIFICANT_DIGITS): string {
  if (x === 0) return numberFormat(locale, digits).format(0);
  let exponent = Math.floor(Math.log10(Math.abs(x)));
  let mantissa = roundSignificant(x / 10 ** exponent, digits);
  if (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    exponent += 1;
  } else if (Math.abs(mantissa) < 1) {
    mantissa *= 10;
    exponent -= 1;
  }
  return `${numberFormat(locale, digits).format(mantissa)} × 10${superscript(exponent)}`;
}

/** Plain notation for moderate magnitudes, scientific otherwise. */
export function formatNumber(x: number, locale: Locale, digits: number = SIGNIFICANT_DIGITS): string {
  const rounded = roundSignificant(x, digits);
  const magnitude = Math.abs(rounded);
  if (rounded === 0 || (magnitude >= PLAIN_MIN && magnitude < PLAIN_MAX)) {
    return numberFormat(locale, digits).format(rounded);
  }
  return formatScientific(x, locale, digits);
}

type Template = string | Plural;

interface Rung {
  /** Size of the unit, in the base unit of the ladder. */
  readonly unit: number;
  /** Smallest value, in the base unit, shown with this rung. */
  readonly from: number;
  readonly template: Template;
}

function formatWithLadder(value: number, ladder: readonly Rung[], locale: Locale, units: Units): string {
  let i = 0;
  while (i < ladder.length - 1 && value >= ladder[i + 1]!.from) i++;
  // Rounding can carry a value over the next threshold (59.97 s → "60 s").
  let rounded = roundSignificant(value / ladder[i]!.unit);
  if (i < ladder.length - 1 && rounded * ladder[i]!.unit >= ladder[i + 1]!.from) {
    i++;
    rounded = roundSignificant(value / ladder[i]!.unit);
  }
  const rung = ladder[i]!;
  const number = formatNumber(rounded, locale);
  const template =
    typeof rung.template === 'string'
      ? rung.template
      : rung.template[pluralRule(locale, SIGNIFICANT_DIGITS).select(rounded) === 'one' ? 'one' : 'other'];
  return fill(template, { value: number });
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

/** A duration in seconds, in the most readable unit. */
export function formatDuration(seconds: number, locale: Locale, units: Units): string {
  const ladder: Rung[] = [
    // Below a picosecond there is no everyday word: seconds in scientific
    // notation. Only the speculative tier reaches it; the model's values start
    // at the electroweak crossover, ~10⁻¹¹ s.
    { unit: 1, from: 0, template: units.seconds },
    { unit: 1e-12, from: 1e-12, template: units.picoseconds },
    { unit: 1e-9, from: 1e-9, template: units.nanoseconds },
    { unit: 1e-6, from: 1e-6, template: units.microseconds },
    { unit: 1e-3, from: 1e-3, template: units.milliseconds },
    { unit: 1, from: 1, template: units.seconds },
    { unit: MINUTE, from: MINUTE, template: units.minutes },
    { unit: HOUR, from: HOUR, template: units.hours },
    { unit: DAY, from: DAY, template: units.days },
    { unit: JULIAN_YEAR, from: JULIAN_YEAR, template: units.years },
    { unit: 1e6 * JULIAN_YEAR, from: 1e6 * JULIAN_YEAR, template: units.millionYears },
    { unit: 1e9 * JULIAN_YEAR, from: 1e9 * JULIAN_YEAR, template: units.billionYears },
  ];
  return formatWithLadder(seconds, ladder, locale, units);
}

/** A length in metres: mm, m, km, astronomical units or light-years. */
export function formatLength(meters: number, locale: Locale, units: Units): string {
  const ladder: Rung[] = [
    { unit: 1e-3, from: 0, template: units.millimeters },
    { unit: 1, from: 1, template: units.meters },
    { unit: 1e3, from: 1e3, template: units.kilometers },
    { unit: ASTRONOMICAL_UNIT, from: 0.01 * ASTRONOMICAL_UNIT, template: units.astronomicalUnits },
    { unit: LIGHT_YEAR, from: LIGHT_YEAR, template: units.lightYears },
    { unit: 1e6 * LIGHT_YEAR, from: 1e6 * LIGHT_YEAR, template: units.millionLightYears },
    { unit: 1e9 * LIGHT_YEAR, from: 1e9 * LIGHT_YEAR, template: units.billionLightYears },
  ];
  return formatWithLadder(meters, ladder, locale, units);
}

/**
 * A large count in words: "1,27 billones de" (es), "1.27 trillion" (en).
 * Spanish forms end in "de" so that a noun can follow ("… de veces").
 * Below a million, digits; from 10¹⁸ on, scientific notation.
 */
export function formatCount(x: number, locale: Locale, units: Units): string {
  const ladder: Rung[] = [
    { unit: 1, from: 0, template: '{value}' },
    { unit: 1e6, from: 1e6, template: units.countMillion },
    { unit: 1e9, from: 1e9, template: units.countBillion },
    { unit: 1e12, from: 1e12, template: units.countTrillion },
    { unit: 1e15, from: 1e15, template: units.countQuadrillion },
    { unit: 1, from: 1e18, template: '{value}' },
  ];
  return formatWithLadder(x, ladder, locale, units);
}

/** Kelvin → whole degrees Celsius, with a true minus sign. */
export function formatCelsius(kelvin: number, locale: Locale): string {
  const celsius = Math.round(kelvin - CELSIUS_ZERO_K);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    .format(celsius === 0 ? 0 : celsius)
    .replace('-', '−');
}

export function formatTemperature(kelvin: number, locale: Locale, units: Units): string {
  return fill(units.kelvin, { value: formatNumber(kelvin, locale) });
}

const ENERGY_PREFIXES = ['', 'k', 'M', 'G', 'T'] as const;

/** Thermal energy k_B·T with an SI prefix on eV. */
export function formatThermalEnergy(kelvin: number, locale: Locale, units: Units): string {
  const ev = kelvin * BOLTZMANN_GEV_PER_K * 1e9;
  let p = 0;
  while (p < ENERGY_PREFIXES.length - 1 && roundSignificant(ev / 1000 ** p) >= 1000) p++;
  return fill(units.electronVolts, {
    value: formatNumber(ev / 1000 ** p, locale),
    prefix: ENERGY_PREFIXES[p]!,
  });
}

/** Hubble rate given in s⁻¹, shown in km s⁻¹ Mpc⁻¹. */
export function formatHubble(perSecond: number, locale: Locale, units: Units): string {
  return fill(units.hubble, { value: formatNumber((perSecond * MEGAPARSEC) / 1e3, locale) });
}

export function formatPercent(fraction: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumSignificantDigits: 2 }).format(fraction);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}
