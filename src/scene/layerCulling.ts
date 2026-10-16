// O1: do not draw particle layers whose every fragment adds exactly +0.
//
// The matter and halo fragments are colour × vBright × disc with vBright a
// product that starts with uGas; the galaxy fragments are colour × vFade with
// vFade a product that ends with uVisible. Every other factor is finite, so
// when that uniform is 0 each fragment's RGB is ±0 and additive blending leaves
// every RGB value it touches bit-for-bit unchanged (x + 0 = x). Skipping the
// draw removes that work and nothing else in RGB.
//
// The one buffer value that does change is the scene target's alpha: the
// fragment shaders write alpha 1 and three's AdditiveBlending adds it
// (blendFuncSeparate(SRC_ALPHA, ONE, ONE, ONE)), so each skipped fragment
// would have added 1 to the destination alpha. No later pass reads alpha into
// colour (bloom high-pass, blur and composite use .rgb; the bloom blend is
// ONE, ONE per channel; OutputPass passes alpha through; grading writes 1), and
// the canvas is opaque. scripts/bench-readback.mjs checks all of this on every
// buffer at every stop.

import type { VisualState } from './visualMap';

export interface DrawnLayers {
  /** Matter and its halo pass, which share uGas. */
  readonly matter: boolean;
  readonly galaxies: boolean;
}

export function drawnLayers(state: Pick<VisualState, 'gasLevel' | 'galaxiesVisible'>, skip: boolean): DrawnLayers {
  if (!skip) return { matter: true, galaxies: true };
  return { matter: state.gasLevel !== 0, galaxies: state.galaxiesVisible !== 0 };
}
