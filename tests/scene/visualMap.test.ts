// The physical data → visual parameters map: what comes from the model, what
// stays inside its declared licence, and what never reaches the GPU.

import { describe, expect, it } from 'vitest';
import {
  DRAPER_POINT_K,
  ELECTROWEAK_CROSSOVER_GEV,
  PLANCK2018_DERIVED,
  createCosmology,
  gevToKelvin,
} from '../../src/physics';
import { blackbodySrgb } from '../../src/scene/blackbody';
import { GAS_LEVEL, SPECULATIVE_COLOUR, createVisualMap, type VisualState } from '../../src/scene/visualMap';
import { EPOCHS, resolveEpochs } from '../../src/timeline';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const map = createVisualMap(cosmology, epochs);
const at = (id: string) => epochs.find((e) => e.id === id)!.anchor;
const state = (id: string): VisualState => map.visualState(at(id));
const tLast = cosmology.timeAtRedshift(PLANCK2018_DERIVED.zStar.value);
const tEW = cosmology.timeAtTemperature(gevToKelvin(ELECTROWEAK_CROSSOVER_GEV));
const sweep = (n: number) => Array.from({ length: n + 1 }, (_, i) => tEW * (cosmology.age / tEW) ** (i / n));

describe('visual map', () => {
  it('uses no model value in the speculative tier', () => {
    for (const id of ['planck', 'inflation']) {
      const s = state(id);
      expect(s.speculative).toBe(true);
      expect(s.colour).toEqual(SPECULATIVE_COLOUR);
      expect([s.separation, s.expansion, s.structure, s.stars]).toEqual([0, 0, 0, 0]);
    }
  });

  it('differentiates planck quantum foam, inflation supercooling and the hot big bang flash in the speculative tier', () => {
    const planck = state('planck');
    const inflation = state('inflation');
    // Planck: active quantum foam with high turbulence and faint violet ripples
    expect(planck.turbulence).toBeGreaterThan(0.8);
    expect(planck.cmbLevel).toBeGreaterThan(0.2);
    expect(planck.haze).toBeGreaterThan(0.7);

    // Inflation anchor: stretched smooth and supercooled
    expect(inflation.turbulence).toBeLessThan(0.1);
    expect(inflation.cmbLevel).toBe(0);
    expect(inflation.haze).toBeLessThan(0.25);
    expect(inflation.intensity).toBeLessThan(planck.intensity);

    // Reheating / hot Big Bang flash at its peak (~1e-30 s): brighter than
    // anything before or after it, fully opaque and turbulent.
    const reheating = map.visualState(1e-30);
    expect(reheating.speculative).toBe(true);
    expect(reheating.intensity).toBeGreaterThan(1.1);
    expect(reheating.intensity).toBeGreaterThan(state('quarks').intensity * 1.8);
    expect(reheating.bloomStrength).toBeGreaterThan(1.0);
    expect(reheating.colour[0]).toBeGreaterThan(0.95);
    expect(reheating.haze).toBe(1);
    expect(reheating.turbulence).toBe(1);
  });

  it('ends the reheating cool-down on the quark-plasma state, without a jump', () => {
    const before = map.visualState(tEW * 0.999);
    const after = map.visualState(tEW);
    expect(before.speculative).toBe(true);
    expect(after.speculative).toBe(false);
    for (const key of ['intensity', 'turbulence', 'emit', 'bloomStrength', 'haze'] as const) {
      expect(Math.abs(before[key] - after[key]), key).toBeLessThan(0.02);
    }
  });

  it('differentiates deconfined quarks from confined hadrons across the QCD crossover', () => {
    const quarks = state('quarks');
    const hadrons = state('hadrons');
    expect(quarks.turbulence).toBeGreaterThan(hadrons.turbulence + 0.3);
    expect(quarks.emit).toBeGreaterThan(hadrons.emit + 0.8);
    expect(quarks.bloomStrength).toBeGreaterThan(hadrons.bloomStrength);
  });

  it('leaves nucleosynthesis with its approved emission and bloom', () => {
    const s = state('nucleosynthesis');
    expect(s.emit).toBeCloseTo(3, 2);
    expect(s.bloomStrength).toBeCloseTo(0.9, 2);
  });

  it('takes the colour from the black body at the model temperature', () => {
    const T = cosmology.stateAt(at('recombination')).physical!.temperatureK;
    expect(state('recombination').colour).toEqual(blackbodySrgb(T));
  });

  it('holds the hue at its Draper-point value where the glow is off', () => {
    // The colour-matching fit tails give meaningless hues far below the Draper
    // point (pure green at tens of kelvin); the glow is zero there anyway.
    const draper = blackbodySrgb(DRAPER_POINT_K);
    expect(state('darkAges').colour).toEqual(draper);
    expect(state('today').colour).toEqual(draper);
    // A dull red: red is the brightest channel, blue almost absent.
    expect(draper[0]).toBeCloseTo(1, 12);
    expect(draper[2]).toBeLessThan(0.1);
  });

  it('is opaque until last scattering and transparent well after it', () => {
    expect(map.visualState(tLast * 0.99).haze).toBe(1);
    expect(state('darkAges').haze).toBe(0);
  });

  it('switches the radiation glow off below the Draper point', () => {
    const tDraper = cosmology.timeAtTemperature(DRAPER_POINT_K);
    expect(map.visualState(tDraper * 1.01).glow).toBe(0);
    expect(map.visualState(tDraper * 0.5).glow).toBeGreaterThan(0);
    expect(state('darkAges').glow).toBe(0);
  });

  it('keeps the faint gas visible once the universe is transparent', () => {
    expect(state('darkAges').gas).toBe(GAS_LEVEL);
    expect(state('hadrons').gas).toBe(0);
  });

  it('starts structure and stars at the first-stars anchor, not before', () => {
    expect(map.visualState(at('firstStars') * 0.999).structure).toBe(0);
    expect(map.visualState(at('firstStars') * 0.999).stars).toBe(0);
    expect(state('today').structure).toBe(1);
    expect(state('today').stars).toBe(1);
  });

  it('gives H·t from the model: 1/2 in the radiation era, about 0.95 today', () => {
    expect(state('nucleosynthesis').expansion).toBeCloseTo(0.5, 1);
    expect(state('today').expansion).toBeGreaterThan(0.9);
    expect(state('today').expansion).toBeLessThan(1);
  });

  it('only ever passes normalised or small dimensionless values', () => {
    for (const t of sweep(300)) {
      const s = map.visualState(t);
      for (const v of [s.glow, s.haze, s.gas, s.separation, s.structure, s.stars, ...s.colour]) {
        expect(v, `t = ${t}`).toBeGreaterThanOrEqual(0);
        expect(v, `t = ${t}`).toBeLessThanOrEqual(1);
      }
      expect(s.expansion).toBeLessThan(1.5);
    }
  });

  it('separates monotonically with ln a, from 0 to 1', () => {
    let previous = -1;
    for (const t of sweep(300)) {
      const s = map.visualState(t).separation;
      expect(s).toBeGreaterThanOrEqual(previous);
      previous = s;
    }
    expect(map.visualState(cosmology.age).separation).toBe(1);
    expect(map.growth).toBeCloseTo(1 / cosmology.scaleFactorAtTime(tEW), -10);
  });
});
