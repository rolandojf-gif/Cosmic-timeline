import { describe, expect, it } from 'vitest';
import { shouldShowContinueCue } from '../../src/ui/continueCue';

describe('milestone continuation cue', () => {
  it('appears when auto-pausing and when landing on a milestone', () => {
    expect(shouldShowContinueCue(false, true, true)).toBe(true);
    expect(shouldShowContinueCue(false, true, false)).toBe(true);
  });

  it('also appears when the visitor manually pauses a running journey', () => {
    expect(shouldShowContinueCue(false, false, true)).toBe(true);
    expect(shouldShowContinueCue(false, undefined, true)).toBe(true);
  });

  it('does not cover the screen on initial load or during timeline scrubbing', () => {
    expect(shouldShowContinueCue(false, false, false)).toBe(false);
    expect(shouldShowContinueCue(false, undefined, false)).toBe(false);
  });

  it('disappears whenever the journey plays again', () => {
    expect(shouldShowContinueCue(true, true, true)).toBe(false);
    expect(shouldShowContinueCue(true, false, true)).toBe(false);
  });
});
