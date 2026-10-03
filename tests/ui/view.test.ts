// What the panel shows: values only where the model applies, and the right texts.

import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/i18n';
import {
  ASTRONOMICAL_UNIT,
  ELECTROWEAK_CROSSOVER_GEV,
  LIGHT_YEAR,
  PLANCK2018_DERIVED,
  SUN_CENTRAL_TEMPERATURE_K,
  accelerationOnset,
  createCosmology,
  gevToKelvin,
  matterLambdaEquality,
} from '../../src/physics';
import { EPOCHS, resolveEpochs } from '../../src/timeline';
import { panelView, type Context, type PanelView } from '../../src/ui/view';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const context: Context = {
  cosmology,
  epochs,
  milestones: {
    acceleration: accelerationOnset(cosmology).t,
    darkEnergy: matterLambdaEquality(cosmology).t,
  },
  lastScattering: cosmology.timeAtRedshift(PLANCK2018_DERIVED.zStar.value),
};
const at = (id: string) => epochs.find((e) => e.id === id)!.anchor;
const human = (view: PanelView, key: string) => view.human!.find((r) => r.key === key)?.text;
const technical = (view: PanelView, key: string) => view.technical!.find((r) => r.key === key)!;

describe('panel view', () => {
  it('shows no physical values in the speculative tier', () => {
    const tEW = cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
    for (const t of [at('planck'), at('inflation'), tEW * 0.9]) {
      const view = panelView(context, t, 'es', MESSAGES.es);
      expect(view.human).toBeNull();
      expect(view.technical).toBeNull();
      expect(view.tier).toBe(MESSAGES.es.tier.speculative);
    }
  });

  it('shows the model values, with the approved label, from the electroweak crossover on', () => {
    for (const id of ['quarks', 'recombination', 'today']) {
      const view = panelView(context, at(id), 'en', MESSAGES.en);
      expect(view.human!.map((r) => r.label)).toContain('Radius of the region we observe today');
      expect(view.technical!.map((r) => r.label)).toContain('Radius of the region we observe today');
    }
  });

  it('gives today: no lookback, z = 0 and the current radius', () => {
    const view = panelView(context, cosmology.age, 'en', MESSAGES.en);
    expect(view.lookback).toBeNull();
    expect(view.time).toBe('13.8 billion years');
    expect(technical(view, 'redshift').value).toBe('0');
    expect(technical(view, 'observedRegion').value).toBe('46.2 billion light-years');
    expect(human(view, 'observedRegion')).toBe('46.2 billion light-years');
    expect(view.description).toContain('6.14 billion years ago');
    // Factors of one say nothing: no distances or light lines, no meaning for z and a.
    expect(human(view, 'distances')).toBeUndefined();
    expect(human(view, 'light')).toBeUndefined();
    expect(technical(view, 'redshift').meaning).toBeNull();
    expect(technical(view, 'scaleFactor').meaning).toBeNull();
  });

  it('gives recombination its model values in Spanish', () => {
    const view = panelView(context, at('recombination'), 'es', MESSAGES.es);
    expect(view.time).toBe('372.000 años');
    expect(technical(view, 'temperature').value).toBe('2970 K');
    expect(technical(view, 'redshift').value).toBe('1090');
    expect(view.valueText).toBe('372.000 años, Recombinación');
  });
});

describe('main layer, in everyday terms', () => {
  it('compares very hot temperatures with the centre of the Sun', () => {
    const view = panelView(context, at('hadrons'), 'es', MESSAGES.es);
    expect(human(view, 'temperature')).toBe('1,82 billones de grados, 116.000 veces la temperatura del centro del Sol');
    // The ratio is the model temperature over the sourced reference.
    const T = cosmology.stateAt(at('hadrons')).physical!.temperatureK;
    expect(Math.round(T / SUN_CENTRAL_TEMPERATURE_K / 1000)).toBe(116);
  });

  // ~10¹² K: "billones" in Spanish (long scale), "trillion" in English (short scale).
  it('names the hadron-epoch temperature with each language scale', () => {
    const es = panelView(context, at('hadrons'), 'es', MESSAGES.es);
    const en = panelView(context, at('hadrons'), 'en', MESSAGES.en);
    expect(human(es, 'temperature')).toBe('1,82 billones de grados, 116.000 veces la temperatura del centro del Sol');
    expect(human(en, 'temperature')).toBe('1.82 trillion degrees, 116,000 times the temperature at the centre of the Sun');
    expect(human(es, 'distances')).toBe('Todo estaba 1,27 billones de veces más cerca que hoy.');
    expect(human(en, 'distances')).toBe('Everything was 1.27 trillion times closer than today.');
  });

  it('uses words, not scientific notation, at every instant with model values', () => {
    const tEW = cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
    for (const locale of ['es', 'en'] as const) {
      for (let i = 0; i <= 400; i++) {
        const t = tEW * (cosmology.age / tEW) ** (i / 400);
        const view = panelView(context, t, locale, MESSAGES[locale]);
        if (view.human === null) continue;
        expect(view.time, `${locale} t = ${t}`).not.toContain('×');
        for (const row of view.human) expect(row.text, `${locale} t = ${t} ${row.key}`).not.toContain('×');
      }
    }
  });

  it('gives degrees Celsius once the temperature is everyday-sized', () => {
    const view = panelView(context, at('recombination'), 'es', MESSAGES.es);
    expect(human(view, 'temperature')).toBe('2700 °C');
    expect(human(view, 'distances')).toBe('Todo estaba 1090 veces más cerca que hoy.');
    expect(human(view, 'expansion')).toBe('Al ritmo de ese instante, las distancias se duplicarían en 434.000 años.');
    expect(human(view, 'light')).toBe('La luz que sale de aquí nos llega hoy estirada 1090 veces.');
  });

  it('measures cold temperatures from absolute zero too', () => {
    const view = panelView(context, at('firstStars'), 'es', MESSAGES.es);
    expect(human(view, 'temperature')).toBe('−202 °C, a 70,9 grados del cero absoluto');
  });

  it('says no light reaches us from before last scattering', () => {
    for (const id of ['quarks', 'hadrons', 'nucleosynthesis']) {
      const view = panelView(context, at(id), 'en', MESSAGES.en);
      expect(human(view, 'light'), id).toBe(MESSAGES.en.panel.lightOpaque);
    }
    const after = panelView(context, context.lastScattering * 1.01, 'en', MESSAGES.en);
    expect(human(after, 'light')).not.toBe(MESSAGES.en.panel.lightOpaque);
  });

  it('never uses astronomical units or megaparsecs', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const e of epochs) {
        const view = panelView(context, e.anchor, locale, MESSAGES[locale]);
        for (const row of view.human ?? []) {
          expect(row.text, `${locale} ${e.id} ${row.key}`).not.toMatch(/\b(ua|au|Mpc)\b/);
        }
      }
    }
  });

  it('pairs each technical factor with its everyday reading', () => {
    const view = panelView(context, at('firstStars'), 'en', MESSAGES.en);
    expect(technical(view, 'redshift')).toMatchObject({ value: '25', meaning: 'Light arrives stretched 1 + z = 26 times.' });
    expect(technical(view, 'scaleFactor').meaning).toContain('1/a = 26 times');
    expect(technical(view, 'hubble').meaning).toContain('135 million years');
  });
});

describe('radius of the region we observe today', () => {
  it('is a(t) times the radius today at every stop, in both layers', () => {
    for (const e of epochs) {
      const p = cosmology.stateAt(e.anchor).physical;
      if (p === null) continue;
      expect(p.observedRegionRadius / (p.a * cosmology.observableRadiusToday), e.id).toBeCloseTo(1, 12);
    }
  });

  // Rolando's report: at z = 25 the panel seemed to show "1.78 billion light-years / 2300 au".
  // They belong to two different stops: 2300 au is the radius at the hadron stop.
  it('shows one distance per instant: 1.78 billion light-years at z = 25', () => {
    const view = panelView(context, at('firstStars'), 'es', MESSAGES.es);
    expect(technical(view, 'redshift').value).toBe('25');
    expect(human(view, 'observedRegion')).toBe('1,78 mil millones de años luz');
    expect(technical(view, 'observedRegion').value).toBe('1,78 mil millones de años luz');
  });

  it('uses km and the Earth-Sun distance when the region is smaller than a light-year', () => {
    const view = panelView(context, at('hadrons'), 'es', MESSAGES.es);
    expect(human(view, 'observedRegion')).toBe('344 mil millones de km, unas 2300 veces la distancia de la Tierra al Sol');
    expect(technical(view, 'observedRegion').value).toBe('2300 ua');
    const r = cosmology.stateAt(at('hadrons')).physical!.observedRegionRadius;
    expect(r).toBeLessThan(LIGHT_YEAR);
    expect(Math.round(r / ASTRONOMICAL_UNIT / 100)).toBe(23);
  });

  it('converts between astronomical units and light-years consistently', () => {
    // IAU: 1 au = 149 597 870 700 m; 1 ly = c × Julian year ≈ 63 241 au.
    expect(LIGHT_YEAR / ASTRONOMICAL_UNIT).toBeCloseTo(63_241.08, 1);
    // 1.78 billion light-years is about 1.1 × 10¹⁴ au, not 2300.
    expect((1.78e9 * LIGHT_YEAR) / ASTRONOMICAL_UNIT).toBeGreaterThan(1e14);
  });

  it('says when an anchor is illustrative', () => {
    for (const e of epochs) {
      const view = panelView(context, e.anchor, 'es', MESSAGES.es);
      expect(view.illustrative !== null, e.id).toBe(e.epoch.illustrativeAnchor);
    }
  });

  it('lists the observed galaxies inside the first-stars epoch', () => {
    const view = panelView(context, at('firstStars'), 'en', MESSAGES.en);
    expect(view.landmarks).toHaveLength(2);
    expect(view.landmarks[0]!.text).toContain('MoM-z14 (z = 14.4');
  });

  it('cites each observed galaxy with its own source, not the epoch source', () => {
    const view = panelView(context, at('firstStars'), 'en', MESSAGES.en);
    expect(view.landmarks.map((l) => l.sources.map((s) => s.url))).toEqual([
      ['https://arxiv.org/abs/2505.11263'],
      ['https://doi.org/10.1038/s41586-024-07860-9'],
    ]);
  });
});
