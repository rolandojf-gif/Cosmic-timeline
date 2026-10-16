import { describe, expect, it } from 'vitest';
import { shouldShowContinueCue } from '../../src/ui/continueCue';

describe('milestone continuation cue', () => {
  it('appears only after an actual automatic playback stop', () => {
    expect(shouldShowContinueCue(false, true)).toBe(true);
    expect(shouldShowContinueCue(false, undefined)).toBe(false);
    expect(shouldShowContinueCue(false, false)).toBe(false);
  });

  it('disappears whenever the journey plays again', () => {
    expect(shouldShowContinueCue(true, true)).toBe(false);
    expect(shouldShowContinueCue(true, false)).toBe(false);
  });
});
