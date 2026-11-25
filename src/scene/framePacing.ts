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
export type SceneFpsCap = (typeof VALID_SCENE_FPS)[number];
export const FPS_CAP_STORAGE_KEY = 'cosmic-timeline:fpscap';

/** Cycle order when toggling from the UI: one click jumps from 30 to 60 fps. */
const FPS_CYCLE: readonly SceneFpsCap[] = [30, 60, 24, 45];

export function parseFpsCap(raw: string | null | undefined): SceneFpsCap | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return VALID_SCENE_FPS.includes(parsed as SceneFpsCap) ? (parsed as SceneFpsCap) : null;
}

/** Optional ?fpscap=24/30/45/60 for visual comparison and GPU diagnostics. */
export function sceneFpsCap(search: string): SceneFpsCap {
  return parseFpsCap(new URLSearchParams(search).get('fpscap')) ?? DEFAULT_SCENE_FPS;
}

/** URL ?fpscap overrides persisted preference; falls back to DEFAULT_SCENE_FPS. */
export function resolveInitialFpsCap(search: string, stored: string | null | undefined): SceneFpsCap {
  return parseFpsCap(new URLSearchParams(search).get('fpscap')) ?? parseFpsCap(stored) ?? DEFAULT_SCENE_FPS;
}

export function nextFpsCap(current: SceneFpsCap): SceneFpsCap {
  const idx = FPS_CYCLE.indexOf(current);
  return FPS_CYCLE[(idx + 1) % FPS_CYCLE.length]!;
}

/** Allow a 1 ms margin to avoid missing every second browser refresh. */
export function shouldRenderFrame(nowMs: number, lastRenderedMs: number, fpsCap: number): boolean {
  return lastRenderedMs === 0 || nowMs - lastRenderedMs >= 1000 / fpsCap - 1;
}

/** A paused, settled universe does not need a permanent GPU render loop. */
export function sceneNeedsFrames(playing: boolean, transitioning: boolean, interacting: boolean): boolean {
  return playing || transitioning || interacting;
}

/** Preserve camera damping per *second*, not per frame, when FPS is capped. */
export function cameraDamping(frameMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const clampedMs = Math.max(0, Math.min(frameMs, 100));
  return 1 - Math.pow(0.88, clampedMs / (1000 / 60));
}
