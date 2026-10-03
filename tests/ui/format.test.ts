// Number and unit formatting: significant figures, unit thresholds, locales.

import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/i18n';
import { GYR, JULIAN_YEAR, LIGHT_YEAR, gevToKelvin } from '../../src/physics';
import {
  formatDuration,
  formatHubble,
  formatLength,
  formatNumber,
  formatPowerOfTen,
  formatScientific,
  formatTemperature,
  formatThermalEnergy,
  roundSignificant,
} from '../../src/ui/format';

const es = MESSAGES.es.units;
const en = MESSAGES.en.units;

describe('significant figures', () => {
  it('rounds to three significant figures across the whole range', () => {
    expect(roundSignificant(13.786)).toBe(13.8);
    expect(roundSignificant(371_800)).toBe(372_000);
    expect(roundSignificant(5.391247e-44)).toBeCloseTo(5.39e-44, 50);
    expect(roundSignificant(4.35e17)).toBe(4.35e17);
    expect(roundSignificant(0)).toBe(0);
  });

  it('writes scientific notation with the locale decimal sign and superscripts', () => {
    expect(formatScientific(9.35e-12, 'es')).toBe('9,35 × 10⁻¹²');
    expect(formatScientific(9.35e-12, 'en')).toBe('9.35 × 10⁻¹²');
    expect(formatScientific(1.85e15, 'en')).toBe('1.85 × 10¹⁵');
  });

  it('carries a mantissa that rounds up to ten into the exponent', () => {
    expect(formatScientific(9.996e-5, 'en')).toBe('1 × 10⁻⁴');
  });

  it('uses plain notation between 10⁻³ and 10⁶', () => {
    expect(formatNumber(1089.8, 'en')).toBe('1,090');
    expect(formatNumber(0.30312, 'es')).toBe('0,303');
    expect(formatNumber(999_999, 'en')).toBe('1 × 10⁶');
    expect(formatNumber(0, 'en')).toBe('0');
  });

  it('writes exact powers of ten without a mantissa', () => {
    expect(formatPowerOfTen(-43)).toBe('10⁻⁴³');
    expect(formatPowerOfTen(0)).toBe('1');
    expect(formatPowerOfTen(10)).toBe('10¹⁰');
  });
});

describe('durations', () => {
  it('chooses the unit by magnitude', () => {
    expect(formatDuration(5.391247e-44, 'en', en)).toBe('5.39 × 10⁻⁴⁴ s');
    expect(formatDuration(0.746, 'en', en)).toBe('0.746 s');
    expect(formatDuration(119, 'en', en)).toBe('1.98 min');
    expect(formatDuration(371_800 * JULIAN_YEAR, 'en', en)).toBe('372,000 years');
    expect(formatDuration(656.7e6 * JULIAN_YEAR, 'en', en)).toBe('657 million years');
    expect(formatDuration(13.786 * GYR, 'en', en)).toBe('13.8 billion years');
  });

  it('writes Spanish with its own separators and words', () => {
    expect(formatDuration(371_800 * JULIAN_YEAR, 'es', es)).toBe('372.000 años');
    expect(formatDuration(13.786 * GYR, 'es', es)).toBe('13,8 mil millones de años');
    expect(formatDuration(1e6 * JULIAN_YEAR, 'es', es)).toBe('1 millón de años');
  });

  it('moves to the next unit when rounding reaches it', () => {
    expect(formatDuration(59.97, 'en', en)).toBe('1 min');
    expect(formatDuration(999_900 * JULIAN_YEAR, 'en', en)).toBe('1 million years');
  });

  it('uses singular and plural forms', () => {
    expect(formatDuration(JULIAN_YEAR, 'en', en)).toBe('1 year');
    expect(formatDuration(2 * JULIAN_YEAR, 'es', es)).toBe('2 años');
  });
});

describe('lengths', () => {
  it('goes from millimetres to billions of light-years', () => {
    expect(formatLength(5.6e-3, 'en', en)).toBe('5.6 mm');
    expect(formatLength(11_000, 'en', en)).toBe('11 km');
    expect(formatLength(2.17e11, 'en', en)).toBe('1.45 au');
    expect(formatLength(102 * LIGHT_YEAR, 'en', en)).toBe('102 light-years');
    expect(formatLength(42.3e6 * LIGHT_YEAR, 'es', es)).toBe('42,3 millones de años luz');
    expect(formatLength(46.19e9 * LIGHT_YEAR, 'en', en)).toBe('46.2 billion light-years');
  });
});

describe('temperature, energy and expansion rate', () => {
  it('formats temperatures in kelvin', () => {
    expect(formatTemperature(2.7255, 'es', es)).toBe('2,73 K');
    expect(formatTemperature(2973, 'en', en)).toBe('2,970 K');
  });

  it('gives k_B·T with an SI prefix', () => {
    expect(formatThermalEnergy(gevToKelvin(159.5), 'en', en)).toBe('160 GeV');
    expect(formatThermalEnergy(gevToKelvin(0.1565), 'en', en)).toBe('157 MeV');
    expect(formatThermalEnergy(gevToKelvin(1e-4), 'en', en)).toBe('100 keV');
  });

  it('shows H in km s⁻¹ Mpc⁻¹', () => {
    const h0 = (67.66 * 1e3) / 3.0856775814913673e22;
    expect(formatHubble(h0, 'en', en)).toBe('67.7 km s⁻¹ Mpc⁻¹');
  });
});
