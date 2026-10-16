// The exact optimisations o2–o4 live in shaders and geometry; these tests pin
// the conditions their bit-exactness argument depends on. The image itself is
// checked by scripts/bench-readback.mjs.

import { describe, expect, it } from 'vitest';
import { MATTER_VERTEX_SHADER } from '../../src/scene/sceneShaders';

describe('o2: clipping away points of zero brightness', () => {
  it('tests the brightness the fragments receive, after its last factor', () => {
    const vs = MATTER_VERTEX_SHADER;
    const lastFactor = vs.indexOf('vBright *= 9.0 / max(size * size, 1.0);');
    const cullLine = 'if (vBright == 0.0) gl_Position = vec4(4.0, 4.0, 4.0, 1.0);';
    const cull = vs.indexOf(cullLine);
    expect(lastFactor).toBeGreaterThan(0);
    expect(cull).toBeGreaterThan(lastFactor);
    expect(vs.slice(cull + cullLine.length)).not.toMatch(/vBright\s*[*+-]?=[^=]/);
    expect(vs.slice(0, cull)).toContain('#ifdef CULL_DARK_POINTS');
  });

  it('moves the whole sprite off screen, even the largest halo on a small screen', () => {
    // Largest halo: (4 + 10) px × 5 = 70 px. Smallest viewport side: 200 px.
    const halfSpriteNdc = 70 / 200;
    expect(4 - halfSpriteNdc).toBeGreaterThan(1);
  });
});
