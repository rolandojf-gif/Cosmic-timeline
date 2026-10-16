/**
 * Presentation-only GPU work selection. The exact cosmological field,
 * colour functions, bloom and full-resolution matter/galaxies are unchanged.
 */
export const DEFAULT_PLASMA_SCALE = 0.7;
export const SUPPORTED_PLASMA_SCALES = [0.5, 0.7, 0.85, 1] as const;

/** Plasma is soft by nature. Sample it separately, then bilinearly upscale.
 * Use ?plasmaScale=1 to compare against full-resolution volumetric sampling.
 */
export function plasmaRenderScale(search: string): number {
  const requested = new URLSearchParams(search).get('plasmaScale');
  if (requested === null) return DEFAULT_PLASMA_SCALE;
  const candidate = Number(requested);
  return SUPPORTED_PLASMA_SCALES.includes(candidate as (typeof SUPPORTED_PLASMA_SCALES)[number])
    ? candidate
    : DEFAULT_PLASMA_SCALE;
}

export function scaledBufferSize(width: number, height: number, pixelRatio: number, scale: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(width * pixelRatio * scale)),
    height: Math.max(1, Math.round(height * pixelRatio * scale)),
  };
}

/** GPU point draws can be omitted when their shader would output zero light. */
export function visibleLayers(state: {
  gasLevel: number;
  halo: number;
  galaxiesVisible: number;
  haze: number;
  cmbLevel: number;
}): { plasma: boolean; matter: boolean; halos: boolean; galaxies: boolean } {
  const matter = state.gasLevel > 0;
  return {
    plasma: state.haze > 0.001 || state.cmbLevel > 0,
    matter,
    halos: matter && state.halo > 0,
    galaxies: state.galaxiesVisible > 0,
  };
}
