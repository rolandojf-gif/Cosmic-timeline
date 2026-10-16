import { describe, expect, it } from 'vitest';
import { DEFAULT_PLASMA_SCALE, plasmaRenderScale, scaledBufferSize, visibleLayers } from '../../src/scene/plasmaQuality';

describe('volumetric GPU presentation budget', () => {
  it('keeps the full resolution comparison accessible', () => {
    expect(plasmaRenderScale('')).toBe(DEFAULT_PLASMA_SCALE);
    expect(plasmaRenderScale('?fps&plasmaScale=1')).toBe(1);
    expect(plasmaRenderScale('?plasmaScale=0.5')).toBe(0.5);
    expect(plasmaRenderScale('?plasmaScale=0.85')).toBe(0.85);
    expect(plasmaRenderScale('?plasmaScale=oops')).toBe(DEFAULT_PLASMA_SCALE);
    expect(plasmaRenderScale('?plasmaScale=5')).toBe(DEFAULT_PLASMA_SCALE);
  });

  it('shrinks only the separate volumetric render target', () => {
    expect(scaledBufferSize(1440, 900, 1.5, 0.7)).toEqual({ width: 1512, height: 945 });
    expect(scaledBufferSize(1, 1, 1, 0.5)).toEqual({ width: 1, height: 1 });
  });

  it('omits the invisible particle and galaxy draws in opaque plasma epochs', () => {
    expect(visibleLayers({ gasLevel: 0, halo: 0, galaxiesVisible: 0, haze: 1, cmbLevel: 0 }))
      .toEqual({ plasma: true, matter: false, halos: false, galaxies: false });
    expect(visibleLayers({ gasLevel: 1.4, halo: 0.4, galaxiesVisible: 1, haze: 0, cmbLevel: 0 }))
      .toEqual({ plasma: false, matter: true, halos: true, galaxies: true });
    expect(visibleLayers({ gasLevel: 0, halo: 0, galaxiesVisible: 0, haze: 0, cmbLevel: 0 }))
      .toEqual({ plasma: false, matter: false, halos: false, galaxies: false });
  });
});
