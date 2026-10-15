/**
 * Frame pacing is a presentation-only optimisation: no particle budgets,
 * shaders, bloom, or physical modelling are modified.
 *
 * Browsers can request 60–144+ frames per second. This full-fidelity WebGL
 * scene is expensive, so limit costly composer.render() calls while keeping
 * the timeline state and input events responsive.
 */
export const DEFAULT_SCENE_FPS = 30;
export const VALID_SCENE_FPS = [24, 30, 45, 60] as const;

/** Optional ?fpscap=24/30/45/60 for visual comparison and GPU diagnostics. */
export function sceneFpsCap(search: string): number {
  const requested = new URLSearchParams(search).get('fpscap');
  const parsed = requested === null ? NaN : Number(requested);
  return VALID_SCENE_FPS.includes(parsed as (typeof VALID_SCENE_FPS)[number])
    ? parsed
    : DEFAULT_SCENE_FPS;
}

/** Allow a 1 ms margin to avoid missing every second browser refresh. */
export function shouldRenderFrame(nowMs: number, lastRenderedMs: number, fpsCap: number): boolean {
  return lastRenderedMs === 0 || nowMs - lastRenderedMs >= 1000 / fpsCap - 1;
}

/** A paused, settled universe does not need a permanent GPU render loop. */
export function sceneNeedsFrames(playing: boolean, transitioning: boolean, interacting: boolean): boolean {
  return playing || transitioning || interacting;
}
