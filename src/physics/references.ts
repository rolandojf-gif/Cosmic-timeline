// Everyday and solar reference values used to put the model's numbers in
// human terms ("116,000 times the temperature at the centre of the Sun").
// They are data like any other: each has its source in docs/fuentes.md, and
// the interface only ever shows ratios computed from them.

/** 0 °C in kelvin (definition of the degree Celsius; BIPM SI Brochure, 9th ed., 2019). */
export const CELSIUS_ZERO_K = 273.15;

/**
 * Nominal solar effective temperature [K] (IAU 2015 Resolution B3;
 * Prša et al. 2016, AJ 152, 41). Measured value 5772.0 ± 0.8 K.
 */
export const SUN_SURFACE_TEMPERATURE_K = 5772;

/**
 * Central temperature of the present-day Sun [K] in the standard solar model
 * (Bahcall, Pinsonneault & Basu 2001, ApJ 555, 990, Table 5: 15.696 × 10⁶ K).
 * Shown with three significant figures.
 */
export const SUN_CENTRAL_TEMPERATURE_K = 1.5696e7;

/**
 * Draper point [K]: roughly the temperature above which a hot body visibly
 * glows; below it, black-body radiation is almost all infrared (Draper 1847,
 * Phil. Mag. 30, 345: 977 °F = 525 °C).
 */
export const DRAPER_POINT_K = 798;
