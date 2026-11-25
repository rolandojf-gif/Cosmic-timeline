import { describe, expect, it } from 'vitest';
import { createCosmology } from '../../src/physics';
import { EPOCHS, createTimeScale, resolveEpochs } from '../../src/timeline';
import { REHEATING_TIME_S, buildShareUrl, initialPositionFromUrl } from '../../src/ui/urlState';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const scale = createTimeScale(epochs.map((e) => e.anchor));

describe('shareable URL state', () => {
  it('defaults to Planck (u = 0, explicit = false) when no time parameter is given', () => {
    expect(initialPositionFromUrl('', epochs, scale)).toEqual({ u: 0, explicit: false });
    expect(initialPositionFromUrl('?lang=es', epochs, scale)).toEqual({ u: 0, explicit: false });
    expect(initialPositionFromUrl('?epoch=unknown&t=-5', epochs, scale)).toEqual({ u: 0, explicit: false });
  });

  it('resolves ?epoch=<id> including reheating and case-insensitivity', () => {
    const recIdx = epochs.findIndex((e) => e.epoch.id === 'recombination');
    expect(initialPositionFromUrl('?epoch=recombination', epochs, scale)).toEqual({
      u: scale.positions[recIdx]!,
      explicit: true,
    });
    expect(initialPositionFromUrl('?epoch=MilkyWay', epochs, scale)).toEqual({
      u: scale.positions[epochs.findIndex((e) => e.epoch.id === 'milkyWay')]!,
      explicit: true,
    });
    expect(initialPositionFromUrl('?epoch=reheating', epochs, scale)).toEqual({
      u: scale.positionOf(REHEATING_TIME_S),
      explicit: true,
    });
  });

  it('resolves ?t=<seconds> to the exact control position', () => {
    const t = 1e10;
    const pos = initialPositionFromUrl(`?t=${t}`, epochs, scale);
    expect(pos.explicit).toBe(true);
    expect(pos.u).toBeCloseTo(scale.positionOf(t), 12);
  });

  it('builds named ?epoch URLs near anchors and ?t URLs between stops, round-tripping cleanly', () => {
    const recPos = scale.positions[epochs.findIndex((e) => e.epoch.id === 'recombination')]!;
    const epochUrl = buildShareUrl('https://cosmic-timeline.netlify.app/', recPos, epochs, scale, 'en');
    expect(epochUrl).toBe('https://cosmic-timeline.netlify.app/?epoch=recombination');

    const reheatingUrl = buildShareUrl(
      'https://cosmic-timeline.netlify.app/',
      scale.positionOf(REHEATING_TIME_S),
      epochs,
      scale,
      'es',
    );
    expect(reheatingUrl).toBe('https://cosmic-timeline.netlify.app/?lang=es&epoch=reheating');

    const midU = 0.55;
    const midUrl = buildShareUrl('https://cosmic-timeline.netlify.app/?epoch=planck', midU, epochs, scale, 'en');
    const parsed = new URL(midUrl);
    expect(parsed.searchParams.has('epoch')).toBe(false);
    expect(parsed.searchParams.has('t')).toBe(true);
    const roundTrip = initialPositionFromUrl(parsed.search, epochs, scale);
    expect(roundTrip.explicit).toBe(true);
    expect(roundTrip.u).toBeCloseTo(midU, 2);
  });
});
