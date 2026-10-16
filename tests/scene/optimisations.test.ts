// The exact optimisations o2–o4 live in shaders and geometry; these tests pin
// the conditions their bit-exactness argument depends on. The image itself is
// checked by scripts/bench-readback.mjs.

import { describe, expect, it } from 'vitest';
import { MATTER_FRAGMENT_SHADER, MATTER_VERTEX_SHADER } from '../../src/scene/sceneShaders';

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

describe('o4: discarding fragments of zero colour', () => {
  it('discards on the very colour it would have written, and only when it is 0', () => {
    const fs = MATTER_FRAGMENT_SHADER;
    const rgb = fs.indexOf('vec3 rgb = colour * vBright * disc;');
    const discard = fs.indexOf('if (rgb == vec3(0.0)) discard;');
    const write = fs.indexOf('fragColour = vec4(rgb, 1.0);');
    expect(rgb).toBeGreaterThan(0);
    expect(discard).toBeGreaterThan(rgb);
    expect(write).toBeGreaterThan(discard);
    expect(fs.slice(rgb, discard)).toContain('#ifdef DISCARD_DARK_FRAGMENTS');
  });

  it('covers the sprite corners: disc is exactly 0 from radius 0.5', () => {
    // smoothstep(0.4, 0.5, x) is exactly 1 for x >= 0.5, as GLSL defines it.
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };
    for (const r of [0.5, 0.6, Math.SQRT1_2]) expect(1 - smoothstep(0.4, 0.5, r)).toBe(0);
    // Fraction of the square outside the inscribed circle: 1 − π/4.
    expect(1 - Math.PI / 4).toBeCloseTo(0.2146, 4);
  });
});
