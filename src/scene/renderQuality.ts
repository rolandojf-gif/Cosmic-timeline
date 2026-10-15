/**
 * GPU presentation budget. No physical quantities or chronology live here.
 * Quality is selected once at scene creation; only framebuffer resolution may
 * adapt during playback, so galaxies and cosmic landmarks never jump.
 */
export type RenderProfile = 'low' | 'balanced' | 'high';

export interface RenderBudget {
  readonly n: number;
  readonly maxDpr: number;
  readonly minDpr: number;
  readonly raySteps: number;
  readonly rayScale: number;
  readonly noiseSize: number;
  readonly bloom: boolean;
}

export function profileFromSearch(search: string, mobile: boolean): RenderProfile {
  const requested = new URLSearchParams(search).get('quality');
  if (requested === 'high') return 'high';
  if (requested === 'low') return 'low';
  if (requested === 'balanced') return 'balanced';
  return mobile ? 'low' : 'balanced';
}

export function budgetFor(profile: RenderProfile): RenderBudget {
  switch (profile) {
    case 'low':
      return { n: 48, maxDpr: 1, minDpr: 0.75, raySteps: 14, rayScale: 1.9, noiseSize: 32, bloom: false };
    case 'balanced':
      return { n: 64, maxDpr: 1.15, minDpr: 0.8, raySteps: 20, rayScale: 1.38, noiseSize: 48, bloom: false };
    case 'high':
      return { n: 128, maxDpr: 1.5, minDpr: 1.5, raySteps: 28, rayScale: 1, noiseSize: 64, bloom: true };
  }
}

/** Slow downgrades, faster upgrades, wide dead band: avoid oscillation. */
export function adaptedDpr(current: number, averageFrameMs: number, budget: RenderBudget): number {
  if (budget.bloom || !Number.isFinite(averageFrameMs)) return current; // high is an explicit manual request
  const clamp = (v: number): number => Math.min(budget.maxDpr, Math.max(budget.minDpr, Math.round(v * 100) / 100));
  if (averageFrameMs > 32) return clamp(current - 0.15);
  if (averageFrameMs < 18) return clamp(current + 0.1);
  return current;
}

/** Select one sample from each group of eight across the whole periodic box. */
export function haloParticleIndex(sample: number): number {
  const hash = (Math.imul(sample, 1103515245) + 12345) >>> 0;
  return sample * 8 + ((hash >>> 16) & 7);
}
