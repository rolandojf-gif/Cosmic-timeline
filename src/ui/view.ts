// What the panel shows for an instant, as strings. Pure, so that the rules
// (no values in the speculative tier, labels, significant figures, everyday
// comparisons) are tested
// without a browser.

import { fill, type Locale, type Messages } from '../i18n';
import {
  ASTRONOMICAL_UNIT,
  CELSIUS_ZERO_K,
  LIGHT_YEAR,
  SUN_CENTRAL_TEMPERATURE_K,
  SUN_SURFACE_TEMPERATURE_K,
  type Cosmology,
} from '../physics';
import {
  COMPARISON_SOURCES,
  MODEL_SOURCES,
  SOURCES,
  epochIndexAt,
  type ResolvedEpoch,
  type Source,
} from '../timeline';
import {
  formatCelsius,
  formatCount,
  formatDate,
  formatDuration,
  formatHubble,
  formatLength,
  formatNumber,
  formatTemperature,
  formatThermalEnergy,
  roundSignificant,
} from './format';

/** Above this temperature [K] the panel also gives k_B·T (≈ 1 keV). */
const THERMAL_ENERGY_FROM_K = 1e7;

export interface Context {
  readonly cosmology: Cosmology;
  readonly epochs: readonly ResolvedEpoch[];
  /** Times [s] of the dark-energy milestones quoted in the text for today. */
  readonly milestones: { readonly acceleration: number; readonly darkEnergy: number };
  /** Time [s] of last scattering (z*): before it, no light from the instant reaches us. */
  readonly lastScattering: number;
}

/** From this temperature [K] on, °C and K are indistinguishable: compare with the Sun instead. */
const HOT_FROM_K = 1e4;

function humanTemperature(kelvin: number, locale: Locale, m: Messages): string {
  if (kelvin >= HOT_FROM_K) {
    const core = kelvin >= SUN_CENTRAL_TEMPERATURE_K;
    return fill(m.panel.temperatureHot, {
      degrees: formatCount(kelvin, locale, m.units),
      ratio: formatCount(kelvin / (core ? SUN_CENTRAL_TEMPERATURE_K : SUN_SURFACE_TEMPERATURE_K), locale, m.units),
      reference: core ? m.panel.sunCore : m.panel.sunSurface,
    });
  }
  const celsius = formatCelsius(kelvin, locale);
  return kelvin < CELSIUS_ZERO_K
    ? fill(m.panel.temperatureCold, { celsius, kelvin: formatNumber(kelvin, locale) })
    : fill(m.panel.temperatureCelsius, { celsius });
}

/** A line of the main layer: a value in everyday terms. */
export interface HumanRow {
  readonly key: 'temperature' | 'distances' | 'observedRegion' | 'expansion' | 'light';
  readonly label: string;
  readonly text: string;
}

/** A row of the technical layer: the exact value and what it means. */
export interface TechnicalRow {
  readonly key: 'temperature' | 'redshift' | 'scaleFactor' | 'hubble' | 'hubbleRadius' | 'observedRegion';
  readonly label: string;
  readonly value: string;
  readonly meaning: string | null;
}

export interface PanelView {
  readonly epochIndex: number;
  readonly time: string;
  readonly lookback: string | null;
  readonly epochName: string;
  readonly evidence: string;
  readonly interval: string | null;
  readonly illustrative: string | null;
  readonly description: string;
  /** Observations dated inside the epoch, each with its own sources. */
  readonly landmarks: readonly { readonly text: string; readonly sources: readonly Source[] }[];
  readonly sources: readonly Source[];
  /** Main layer; null in the speculative tier, where the model gives no values. */
  readonly human: readonly HumanRow[] | null;
  /** Technical layer; null in the speculative tier. */
  readonly technical: readonly TechnicalRow[] | null;
  readonly tier: string;
  readonly modelSources: readonly Source[];
  readonly comparisonSources: readonly Source[];
  /** aria-valuetext of the control. */
  readonly valueText: string;
}

export function panelView(context: Context, t: number, locale: Locale, m: Messages): PanelView {
  const { cosmology, epochs, milestones } = context;
  const duration = (seconds: number): string => formatDuration(seconds, locale, m.units);
  const epochIndex = epochIndexAt(epochs, t);
  const resolved = epochs[epochIndex]!;
  const { epoch } = resolved;
  const text = m.epochs[epoch.id];
  const state = cosmology.stateAt(t);

  const time = duration(t);
  const lookbackSeconds = cosmology.age - t;

  const description = fill(text.description, {
    acceleration: duration(cosmology.age - milestones.acceleration),
    darkEnergy: duration(cosmology.age - milestones.darkEnergy),
  });

  const landmarks = resolved.landmarks.map((landmark) => {
    const landmarkText = (m.landmarks as Readonly<Record<string, { name: string; description: string }>>)[
      landmark.id
    ];
    if (!landmarkText) throw new Error(`no text for landmark ${landmark.id}`);
    const z = landmark.source.at.kind === 'redshift' ? landmark.source.at.z : 1 / cosmology.scaleFactorAtTime(landmark.time) - 1;
    return {
      text: fill(m.panel.landmark, {
        name: landmarkText.name,
        z: formatNumber(z, locale),
        time: duration(landmark.time),
        description: fill(landmarkText.description, {
          date: landmark.source.recordAsOf ? formatDate(landmark.source.recordAsOf, locale) : '',
        }),
      }),
      sources: landmark.source.sources.map((id) => SOURCES[id]),
    };
  });

  let human: HumanRow[] | null = null;
  let technical: TechnicalRow[] | null = null;
  if (state.physical !== null) {
    const p = state.physical;
    const count = (x: number): string => formatCount(x, locale, m.units);
    const stretch = 1 / p.a;
    const doubling = Math.LN2 / p.hubble;

    human = [
      { key: 'temperature', label: m.panel.temperatureLabel, text: humanTemperature(p.temperatureK, locale, m) },
    ];
    // Today the factors are 1: nothing to say.
    if (roundSignificant(stretch) > 1) {
      human.push({ key: 'distances', label: m.panel.distancesLabel, text: fill(m.panel.distances, { factor: count(stretch) }) });
    }
    human.push({
      key: 'observedRegion',
      label: m.panel.observedRegion,
      text:
        p.observedRegionRadius < LIGHT_YEAR
          ? fill(m.panel.regionNear, {
              km: count(p.observedRegionRadius / 1e3),
              ratio: count(p.observedRegionRadius / ASTRONOMICAL_UNIT),
            })
          : formatLength(p.observedRegionRadius, locale, m.units),
    });
    human.push({ key: 'expansion', label: m.panel.expansionLabel, text: fill(m.panel.expansion, { time: duration(doubling) }) });
    if (t < context.lastScattering) {
      human.push({ key: 'light', label: m.panel.lightLabel, text: m.panel.lightOpaque });
    } else if (roundSignificant(stretch) > 1) {
      human.push({ key: 'light', label: m.panel.lightLabel, text: fill(m.panel.lightStretched, { factor: count(stretch) }) });
    }

    const factor = formatNumber(stretch, locale);
    // Today 1 + z = 1/a = 1: the meaning line would say nothing.
    const stretched = roundSignificant(stretch) > 1;
    technical = [
      {
        key: 'temperature',
        label: m.panel.temperature,
        value: formatTemperature(p.temperatureK, locale, m.units),
        meaning:
          p.temperatureK >= THERMAL_ENERGY_FROM_K
            ? fill(m.panel.thermalEnergy, { energy: formatThermalEnergy(p.temperatureK, locale, m.units) })
            : null,
      },
      { key: 'redshift', label: m.panel.redshift, value: formatNumber(p.z, locale), meaning: stretched ? fill(m.panel.redshiftMeaning, { factor }) : null },
      {
        key: 'scaleFactor',
        label: m.panel.scaleFactor,
        value: formatNumber(p.a, locale),
        meaning: stretched ? fill(m.panel.scaleFactorMeaning, { factor }) : null,
      },
      {
        key: 'hubble',
        label: m.panel.hubble,
        value: formatHubble(p.hubble, locale, m.units),
        meaning: fill(m.panel.hubbleMeaning, { time: duration(doubling) }),
      },
      {
        key: 'hubbleRadius',
        label: m.panel.hubbleRadius,
        value: formatLength(p.hubbleRadius, locale, m.units),
        meaning: m.panel.hubbleRadiusMeaning,
      },
      {
        key: 'observedRegion',
        label: m.panel.observedRegion,
        value: formatLength(p.observedRegionRadius, locale, m.units),
        meaning: fill(m.panel.observedRegionMeaning, {
          today: formatLength(cosmology.observableRadiusToday, locale, m.units),
        }),
      },
    ];
  }

  return {
    epochIndex,
    time,
    lookback: lookbackSeconds > 0 ? duration(lookbackSeconds) : null,
    epochName: text.name,
    evidence: m.evidence[epoch.evidence],
    interval:
      resolved.start !== resolved.end
        ? fill(m.panel.interval, { start: duration(resolved.start), end: duration(resolved.end) })
        : null,
    illustrative: epoch.illustrativeAnchor ? m.panel.illustrative : null,
    description,
    landmarks,
    sources: epoch.sources.map((id) => SOURCES[id]),
    human,
    technical,
    tier: m.tier[state.tier],
    modelSources: MODEL_SOURCES.map((id) => SOURCES[id]),
    comparisonSources: COMPARISON_SOURCES.map((id) => SOURCES[id]),
    valueText: fill(m.control.valueText, { time, epoch: text.name }),
  };
}
