// Epochs: order, coverage, sources, and the times the model assigns them.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GYR, JULIAN_YEAR, PLANCK_TIME, createCosmology } from '../../src/physics';
import { EPOCHS, resolveEpochs, type EpochId } from '../../src/timeline';

const cosmology = createCosmology();
const resolved = resolveEpochs(cosmology, EPOCHS);
const byId = new Map(resolved.map((e) => [e.id, e]));
const get = (id: EpochId) => {
  const e = byId.get(id);
  if (!e) throw new Error(`missing epoch ${id}`);
  return e;
};

const KYR = 1e3 * JULIAN_YEAR;
const MYR = 1e6 * JULIAN_YEAR;

const sourceIds = new Set(
  [...readFileSync(new URL('../../docs/fuentes.md', import.meta.url), 'utf8').matchAll(/^### `([^`]+)`/gm)].map(
    (m) => m[1]!,
  ),
);

describe('epoch list', () => {
  it('has the thirteen approved stops, each once, in order', () => {
    expect(EPOCHS.map((e) => e.id)).toEqual([
      'planck',
      'inflation',
      'quarks',
      'hadrons',
      'nucleosynthesis',
      'recombination',
      'darkAges',
      'firstStars',
      'reionization',
      'milkyWay',
      'solarSystem',
      'earth',
      'today',
    ]);
  });

  it('has strictly increasing anchor times', () => {
    for (let i = 1; i < resolved.length; i++) {
      expect(resolved[i]!.anchor).toBeGreaterThan(resolved[i - 1]!.anchor);
    }
  });

  it('starts at the Planck time and ends today', () => {
    expect(get('planck').anchor).toBe(PLANCK_TIME);
    expect(get('today').anchor).toBe(cosmology.age);
  });

  it('keeps every anchor inside its own interval', () => {
    for (const e of resolved) {
      expect(e.start).toBeLessThanOrEqual(e.anchor);
      expect(e.end).toBeGreaterThanOrEqual(e.anchor);
    }
  });

  it('cites only sources listed in docs/fuentes.md', () => {
    expect(sourceIds.size).toBeGreaterThan(10);
    for (const e of EPOCHS) {
      expect(e.sources.length).toBeGreaterThan(0);
      for (const s of e.sources) expect(sourceIds, `${e.id} → ${s}`).toContain(s);
      for (const l of e.landmarks ?? []) {
        for (const s of l.sources) expect(sourceIds, `${l.id} → ${s}`).toContain(s);
      }
    }
  });

  it('marks as illustrative exactly the anchors that are a choice, not an event', () => {
    const illustrative = EPOCHS.filter((e) => e.illustrativeAnchor).map((e) => e.id);
    expect(illustrative).toEqual(['inflation', 'darkAges', 'firstStars']);
  });

  it('agrees with the physics tiers: speculative epochs have no physical values', () => {
    for (const e of resolved) {
      const state = cosmology.stateAt(e.anchor);
      if (e.epoch.evidence === 'speculative') expect(state.physical).toBeNull();
      else expect(state.physical).not.toBeNull();
    }
  });
});

describe('times derived by the model', () => {
  const within = (value: number, lo: number, hi: number): void => {
    expect(value).toBeGreaterThanOrEqual(lo);
    expect(value).toBeLessThanOrEqual(hi);
  };

  it('quarks: electroweak crossover ≈ 1e-11 s, ends at the QCD crossover', () => {
    within(get('quarks').anchor, 3e-12, 3e-11);
    expect(get('quarks').end).toBe(get('hadrons').anchor);
  });

  it('hadrons: QCD crossover ≈ 1e-5 s, ends at T ≈ 1 MeV (≈ 1 s)', () => {
    within(get('hadrons').anchor, 5e-6, 5e-5);
    within(get('hadrons').end, 0.5, 1.5);
  });

  it('nucleosynthesis: T = 0.1 MeV at ≈ 2 min, abundances fixed by 180 s', () => {
    within(get('nucleosynthesis').anchor, 100, 180);
    expect(get('nucleosynthesis').end).toBe(180);
  });

  it('recombination ≈ 380 000 yr (360–390 kyr)', () => {
    within(get('recombination').anchor / KYR, 360, 390);
  });

  it('dark ages: from recombination to z = 30 (≈ 100 Myr)', () => {
    expect(get('darkAges').start).toBe(get('recombination').anchor);
    within(get('darkAges').anchor / MYR, 14, 19);
    within(get('darkAges').end / MYR, 90, 110);
  });

  it('first stars: z = 30 → 20 is ≈ 100 → 180 Myr', () => {
    const e = get('firstStars');
    within(e.start / MYR, 90, 110);
    within(e.anchor / MYR, 120, 140);
    within(e.end / MYR, 170, 190);
  });

  it('most distant confirmed galaxy (z = 14.44) ≈ 280 Myr', () => {
    const mom = get('firstStars').landmarks.find((l) => l.id === 'momZ14');
    expect(mom).toBeDefined();
    within(mom!.time / MYR, 270, 300);
  });

  it('reionization: midpoint ≈ 650 Myr, complete by ≈ 1.1 Gyr', () => {
    within(get('reionization').anchor / MYR, 600, 720);
    within(get('reionization').end / GYR, 1.0, 1.2);
  });

  it('Milky Way disk starts ≈ 0.8 Gyr after the Big Bang', () => {
    within(get('milkyWay').anchor / GYR, 0.7, 0.9);
  });

  it('Solar System (≈ 9.22 Gyr) precedes the Earth (≈ 9.25 Gyr)', () => {
    within(get('solarSystem').anchor / GYR, 9.15, 9.3);
    within(get('earth').anchor / GYR, 9.18, 9.32);
    expect(get('earth').anchor - get('solarSystem').anchor).toBeCloseTo(27.3 * MYR, -10);
  });
});
