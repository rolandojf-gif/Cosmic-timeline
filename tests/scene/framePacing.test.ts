import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCENE_FPS,
  cameraDamping,
  nextFpsCap,
  parseFpsCap,
  resolveInitialFpsCap,
  sceneFpsCap,
  sceneNeedsFrames,
  shouldRenderFrame,
} from '../../src/scene/framePacing';

describe('cinematic scene frame pacing', () => {
  it('defaults to 30 FPS and only accepts explicitly supported overrides', () => {
    expect(sceneFpsCap('')).toBe(DEFAULT_SCENE_FPS);
    expect(sceneFpsCap('?fps')).toBe(30);
    expect(sceneFpsCap('?fpscap=24')).toBe(24);
    expect(sceneFpsCap('?fpscap=45')).toBe(45);
    expect(sceneFpsCap('?fpscap=60')).toBe(60);
    expect(sceneFpsCap('?fpscap=0')).toBe(30);
    expect(sceneFpsCap('?fpscap=1000')).toBe(30);
    expect(parseFpsCap('60')).toBe(60);
    expect(parseFpsCap('120')).toBeNull();
    expect(parseFpsCap('')).toBeNull();
  });

  it('prefers URL ?fpscap over stored preference and cycles valid FPS caps cleanly', () => {
    expect(resolveInitialFpsCap('', '60')).toBe(60);
    expect(resolveInitialFpsCap('?fpscap=24', '60')).toBe(24);
    expect(resolveInitialFpsCap('', 'invalid')).toBe(DEFAULT_SCENE_FPS);
    expect(resolveInitialFpsCap('', null)).toBe(DEFAULT_SCENE_FPS);
    expect(nextFpsCap(30)).toBe(60);
    expect(nextFpsCap(60)).toBe(24);
    expect(nextFpsCap(24)).toBe(45);
    expect(nextFpsCap(45)).toBe(30);
  });

  it('limits GPU submissions to the configured interval, without using setTimeout', () => {
    expect(shouldRenderFrame(10, 0, 30)).toBe(true);
    expect(shouldRenderFrame(20, 10, 30)).toBe(false);
    expect(shouldRenderFrame(42.3, 10, 30)).toBe(false);
    expect(shouldRenderFrame(42.4, 10, 30)).toBe(true);
    expect(shouldRenderFrame(26, 10, 60)).toBe(true);
  });

  it('preserves camera response independent of render FPS', () => {
    expect(cameraDamping(1000 / 60, false)).toBeCloseTo(0.12, 6);
    const perFrame30 = cameraDamping(1000 / 30, false);
    expect(1 - (1 - perFrame30) ** 2).toBeCloseTo(1 - 0.88 ** 4, 6);
    expect(cameraDamping(1000 / 30, true)).toBe(1);
  });

  it('sleeps when paused and stable, but updates during transitions and gestures', () => {
    expect(sceneNeedsFrames(false, false, false)).toBe(false);
    expect(sceneNeedsFrames(true, false, false)).toBe(true);
    expect(sceneNeedsFrames(false, true, false)).toBe(true);
    expect(sceneNeedsFrames(false, false, true)).toBe(true);
  });
});
