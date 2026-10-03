// What the panel shows for an instant, as strings. Pure, so that the rules
// (no values in the speculative tier, labels, significant figures) are tested
// without a browser.

import { fill, type Locale, type Messages } from '../i18n';
import type { Cosmology } from '../physics';
import { MODEL_SOURCES, SOURCES, epochIndexAt, type ResolvedEpoch, type Source } from '../timeline';
import {
  formatDate,
  formatDuration,
  formatHubble,
  formatLength,
  formatNumber,
  formatTemperature,
  formatThermalEnergy,
} from './format';

/** Above this temperature [K] the panel also gives k_B·T (≈ 1 keV). */
const THERMAL_ENERGY_FROM_K = 1e7;

export interface Context {
  readonly cosmology: Cosmology;
  readonly epochs: readonly ResolvedEpoch[];
  /** Times [s] of the dark-energy milestones quoted in the text for today. */
  readonly milestones: { readonly acceleration: number; readonly darkEnergy: number };
}

export interface ValueRow {
  readonly key: keyof Messages['panel'];
  readonly label: string;
  readonly value: string;
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
  /** Null in the speculative tier: the model gives no values there. */
  readonly values: readonly ValueRow[] | null;
  readonly tier: string;
  readonly modelSources: readonly Source[];
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

  let values: ValueRow[] | null = null;
  if (state.physical !== null) {
    const p = state.physical;
    const temperature = formatTemperature(p.temperatureK, locale, m.units);
    const row = (key: ValueRow['key'], value: string): ValueRow => ({ key, label: m.panel[key], value });
    values = [
      row(
        'temperature',
        p.temperatureK >= THERMAL_ENERGY_FROM_K
          ? fill(m.panel.thermalEnergy, { temperature, energy: formatThermalEnergy(p.temperatureK, locale, m.units) })
          : temperature,
      ),
      row('redshift', formatNumber(p.z, locale)),
      row('scaleFactor', formatNumber(p.a, locale)),
      row('observedRegion', formatLength(p.observedRegionRadius, locale, m.units)),
      row('hubbleRadius', formatLength(p.hubbleRadius, locale, m.units)),
      row('hubble', formatHubble(p.hubble, locale, m.units)),
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
    values,
    tier: m.tier[state.tier],
    modelSources: MODEL_SOURCES.map((id) => SOURCES[id]),
    valueText: fill(m.control.valueText, { time, epoch: text.name }),
  };
}
