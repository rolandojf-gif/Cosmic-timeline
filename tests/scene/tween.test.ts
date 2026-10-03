// The step between instants: ease-in-out, exact arrival, and no jump when it
// is retargeted halfway (dragging).

import { describe, expect, it } from 'vitest';
import { createTween } from '../../src/scene/tween';

describe('tween', () => {
  it('eases in and out and arrives exactly at the target', () => {
    const tween = createTween(0, 2);
    tween.retarget(1, 10);
    expect(tween.valueAt(10)).toBe(0);
    expect(tween.speedAt(10)).toBe(0);
    expect(tween.valueAt(11)).toBeCloseTo(0.5, 12);
    expect(tween.valueAt(12)).toBe(1);
    expect(tween.speedAt(12)).toBe(0);
    expect(tween.doneAt(11.99)).toBe(false);
    expect(tween.doneAt(12)).toBe(true);
  });

  it('keeps position and speed continuous when retargeted mid-way', () => {
    const tween = createTween(0, 2);
    tween.retarget(1, 0);
    const before = { value: tween.valueAt(0.7), speed: tween.speedAt(0.7) };
    tween.retarget(0.2, 0.7);
    expect(tween.valueAt(0.7)).toBeCloseTo(before.value, 12);
    expect(tween.speedAt(0.7)).toBeCloseTo(before.speed, 12);
    expect(tween.valueAt(2.7)).toBeCloseTo(0.2, 12);
  });

  it('jumps without easing (first frame, reduced motion)', () => {
    const tween = createTween(0, 2);
    tween.jump(0.6);
    expect(tween.valueAt(0)).toBe(0.6);
    expect(tween.doneAt(0)).toBe(true);
  });
});
