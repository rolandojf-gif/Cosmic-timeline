// What the panel shows: values only where the model applies, and the right texts.

import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/i18n';
import {
  ELECTROWEAK_CROSSOVER_GEV,
  accelerationOnset,
  createCosmology,
  gevToKelvin,
  matterLambdaEquality,
} from '../../src/physics';
import { EPOCHS, resolveEpochs } from '../../src/timeline';
import { panelView, type Context } from '../../src/ui/view';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const context: Context = {
  cosmology,
  epochs,
  milestones: {
    acceleration: accelerationOnset(cosmology).t,
    darkEnergy: matterLambdaEquality(cosmology).t,
  },
};
const at = (id: string) => epochs.find((e) => e.id === id)!.anchor;

describe('panel view', () => {
  it('shows no physical values in the speculative tier', () => {
    const tEW = cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
    for (const t of [at('planck'), at('inflation'), tEW * 0.9]) {
      const view = panelView(context, t, 'es', MESSAGES.es);
      expect(view.values).toBeNull();
      expect(view.tier).toBe(MESSAGES.es.tier.speculative);
    }
  });

  it('shows the model values, with the approved label, from the electroweak crossover on', () => {
    for (const id of ['quarks', 'recombination', 'today']) {
      const view = panelView(context, at(id), 'en', MESSAGES.en);
      expect(view.values).not.toBeNull();
      expect(view.values!.map((r) => r.label)).toContain('Radius of the region we observe today');
    }
  });

  it('gives today: no lookback, z = 0 and the current radius', () => {
    const view = panelView(context, cosmology.age, 'en', MESSAGES.en);
    expect(view.lookback).toBeNull();
    expect(view.time).toBe('13.8 billion years');
    const value = (key: string) => view.values!.find((r) => r.key === key)!.value;
    expect(value('redshift')).toBe('0');
    expect(value('observedRegion')).toBe('46.2 billion light-years');
    expect(view.description).toContain('6.14 billion years ago');
  });

  it('gives recombination its model values in Spanish', () => {
    const view = panelView(context, at('recombination'), 'es', MESSAGES.es);
    expect(view.time).toBe('372.000 años');
    const value = (key: string) => view.values!.find((r) => r.key === key)!.value;
    expect(value('temperature')).toBe('2970 K');
    expect(value('redshift')).toBe('1090');
    expect(view.valueText).toBe('372.000 años, Recombinación');
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
    expect(view.landmarks[0]).toContain('MoM-z14 (z = 14.4');
  });
});
