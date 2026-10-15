import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_FPS, sceneFpsCap, sceneNeedsFrames, shouldRenderFrame } from '../../src/scene/framePacing';

describe('cinematic scene frame pacing', () => {
  it('defaults to 30 FPS and only accepts explicitly supported overrides', () => {
    expect(sceneFpsCap('')).toBe(DEFAULT_SCENE_FPS);
    expect(sceneFpsCap('?fps')).toBe(30);
    expect(sceneFpsCap('?fpscap=24')).toBe(24);
    expect(sceneFpsCap('?fpscap=45')).toBe(45);
    expect(sceneFpsCap('?fpscap=60')).toBe(60);
    expect(sceneFpsCap('?fpscap=0')).toBe(30);
    expect(sceneFpsCap('?fpscap=1000')).toBe(30);
  });

  it('limits GPU submissions to the configured interval, without using setTimeout', () => {
    expect(shouldRenderFrame(10, 0, 30)).toBe(true);
    expect(shouldRenderFrame(20, 10, 30)).toBe(false);
    expect(shouldRenderFrame(42.3, 10, 30)).toBe(false);
    expect(shouldRenderFrame(42.4, 10, 30)).toBe(true);
    expect(shouldRenderFrame(26, 10, 60)).toBe(true);
  });

  it('sleeps when paused and stable, but updates during transitions and gestures', () => {
    expect(sceneNeedsFrames(false, false, false)).toBe(false);
    expect(sceneNeedsFrames(true, false, false)).toBe(true);
    expect(sceneNeedsFrames(false, true, false)).toBe(true);
    expect(sceneNeedsFrames(false, false, true)).toBe(true);
  });
});
