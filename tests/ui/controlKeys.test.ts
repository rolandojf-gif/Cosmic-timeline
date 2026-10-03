// Keyboard behaviour of the time control (WAI-ARIA slider pattern).

import { describe, expect, it } from 'vitest';
import { COARSE_STEP, FINE_STEP, positionAfterKey } from '../../src/ui/controlKeys';

const stops = [0, 0.1, 0.3, 0.6, 1];

describe('time control keys', () => {
  it('moves by a fine step with the arrows and a coarse one with Shift', () => {
    expect(positionAfterKey('ArrowRight', false, 0.5, stops)).toBeCloseTo(0.5 + FINE_STEP, 12);
    expect(positionAfterKey('ArrowDown', false, 0.5, stops)).toBeCloseTo(0.5 - FINE_STEP, 12);
    expect(positionAfterKey('ArrowUp', true, 0.5, stops)).toBeCloseTo(0.5 + COARSE_STEP, 12);
  });

  it('stays inside [0, 1]', () => {
    expect(positionAfterKey('ArrowLeft', true, 0.001, stops)).toBe(0);
    expect(positionAfterKey('ArrowRight', true, 0.999, stops)).toBe(1);
  });

  it('jumps to the next or previous stop with Page Up and Page Down', () => {
    expect(positionAfterKey('PageUp', false, 0.2, stops)).toBe(0.3);
    expect(positionAfterKey('PageUp', false, 0.3, stops)).toBe(0.6);
    expect(positionAfterKey('PageDown', false, 0.3, stops)).toBe(0.1);
    expect(positionAfterKey('PageDown', false, 0.35, stops)).toBe(0.3);
    expect(positionAfterKey('PageUp', false, 1, stops)).toBe(1);
    expect(positionAfterKey('PageDown', false, 0, stops)).toBe(0);
  });

  it('goes to the ends with Home and End and ignores other keys', () => {
    expect(positionAfterKey('Home', false, 0.4, stops)).toBe(0);
    expect(positionAfterKey('End', false, 0.4, stops)).toBe(1);
    expect(positionAfterKey('a', false, 0.4, stops)).toBeNull();
  });
});
