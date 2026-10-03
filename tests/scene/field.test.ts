// The particle field: deterministic, inside the periodic cube, with the
// declared share of stars and matter gathered near where it started.

import { describe, expect, it } from 'vitest';
import { STAR_FRACTION, busiestDirection, createField } from '../../src/scene/field';

const field = createField(5000);

describe('particle field', () => {
  it('is the same on every run', () => {
    const again = createField(5000);
    expect(again.web).toEqual(field.web);
    expect(again.uniform).toEqual(field.uniform);
  });

  it('keeps every position inside the unit cube', () => {
    for (const array of [field.uniform, field.web]) {
      for (const v of array) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('turns about the declared share of particles into stars', () => {
    const stars = field.star.reduce((n, s) => n + s, 0) / field.count;
    expect(Math.abs(stars - STAR_FRACTION)).toBeLessThan(0.015);
  });

  it('gathers matter locally: web positions stay close to the uniform ones', () => {
    let total = 0;
    for (let i = 0; i < field.count; i++) {
      let d2 = 0;
      for (let axis = 0; axis < 3; axis++) {
        const d = field.web[3 * i + axis]! - field.uniform[3 * i + axis]!;
        const wrapped = d - Math.round(d);
        d2 += wrapped * wrapped;
      }
      total += Math.sqrt(d2);
    }
    expect(total / field.count).toBeLessThan(0.12);
  });

  it('chooses a unit viewing direction', () => {
    const [x, y, z] = busiestDirection(field, 0.25, Math.PI / 6, 16);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
  });
});
