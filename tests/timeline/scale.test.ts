// Control scale: bijective, monotone, anchors exactly at their stops.

import { describe, expect, it } from 'vitest';
import { createCosmology } from '../../src/physics';
import { DEFAULT_EQUAL_SHARE, EPOCHS, createTimeScale, resolveEpochs } from '../../src/timeline';

const cosmology = createCosmology();
const anchors = resolveEpochs(cosmology, EPOCHS).map((e) => e.anchor);
const scale = createTimeScale(anchors);
const rel = (x: number, ref: number): number => Math.abs(x / ref - 1);

describe('piecewise-logarithmic control scale', () => {
  it('runs from the first anchor at 0 to the last at 1', () => {
    expect(scale.positions[0]).toBe(0);
    expect(scale.positions[scale.positions.length - 1]).toBe(1);
    expect(scale.timeAt(0)).toBe(anchors[0]);
    expect(scale.timeAt(1)).toBe(anchors[anchors.length - 1]);
  });

  it('puts every anchor exactly at its stop', () => {
    scale.anchors.forEach((t, i) => {
      expect(scale.timeAt(scale.positions[i]!)).toBe(t);
      expect(Math.abs(scale.positionOf(t) - scale.positions[i]!)).toBeLessThan(1e-15);
    });
  });

  it('gives every segment at least its equal share', () => {
    const n = anchors.length - 1;
    for (let i = 0; i < n; i++) {
      const width = scale.positions[i + 1]! - scale.positions[i]!;
      expect(width).toBeGreaterThanOrEqual(DEFAULT_EQUAL_SHARE / n - 1e-12);
    }
  });

  it('is strictly monotone and round-trips', () => {
    let prev = 0;
    for (let k = 0; k <= 100_000; k++) {
      const u = k / 100_000;
      const t = scale.timeAt(u);
      if (k > 0) expect(t).toBeGreaterThan(prev);
      prev = t;
      expect(Math.abs(scale.positionOf(t) - u)).toBeLessThan(1e-12);
      expect(rel(scale.timeAt(scale.positionOf(t)), t)).toBeLessThan(1e-12);
    }
  });

  it('clamps outside its range', () => {
    expect(scale.timeAt(-0.5)).toBe(anchors[0]);
    expect(scale.timeAt(2)).toBe(anchors[anchors.length - 1]);
    expect(scale.positionOf(1e-60)).toBe(0);
    expect(scale.positionOf(1e30)).toBe(1);
  });

  it('reduces to a pure log10 t scale with no equal share', () => {
    const pure = createTimeScale(anchors, 0);
    const l0 = Math.log10(anchors[0]!);
    const span = Math.log10(anchors[anchors.length - 1]!) - l0;
    for (const t of [1e-40, 1e-10, 1, 1e10, 1e16, 4e17]) {
      expect(pure.positionOf(t)).toBeCloseTo((Math.log10(t) - l0) / span, 12);
    }
  });

  it('fixes the problem it exists for: late stops are crowded on a pure log scale', () => {
    const pure = createTimeScale(anchors, 0);
    const solarSystem = anchors[10]!;
    expect(1 - pure.positionOf(solarSystem)).toBeLessThan(0.003);
    expect(1 - scale.positionOf(solarSystem)).toBeGreaterThan(0.09);
  });

  it('rejects invalid anchors', () => {
    expect(() => createTimeScale([1])).toThrow(RangeError);
    expect(() => createTimeScale([1, 1])).toThrow(RangeError);
    expect(() => createTimeScale([0, 1])).toThrow(RangeError);
    expect(() => createTimeScale([1, 2], 1.5)).toThrow(RangeError);
  });
});
