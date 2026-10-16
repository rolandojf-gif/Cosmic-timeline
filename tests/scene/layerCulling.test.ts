// O1: only layers whose brightness uniform is exactly 0 are skipped, so the
// optimisation can never hide anything that would have been seen.

import { describe, expect, it } from 'vitest';
import { createCosmology } from '../../src/physics';
import { drawnLayers } from '../../src/scene/layerCulling';
import { optimisationsFromUrl } from '../../src/scene/optimisations';
import {
  GALAXIES_FRAGMENT_SHADER,
  GALAXIES_VERTEX_SHADER,
  MATTER_FRAGMENT_SHADER,
  MATTER_VERTEX_SHADER,
} from '../../src/scene/sceneShaders';
import { createVisualMap } from '../../src/scene/visualMap';
import { EPOCHS, createTimeScale, resolveEpochs } from '../../src/timeline';

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const map = createVisualMap(cosmology, epochs);
const scale = createTimeScale(epochs.map((e) => e.anchor));

describe('O1: skipping fully invisible particle layers', () => {
  it('is on by default and ?o1=0 turns it off, independently of the others', () => {
    expect(optimisationsFromUrl('')).toEqual({ o1: true, o2: true, o3: true, o4: true });
    expect(optimisationsFromUrl('?fps&o1=1').o1).toBe(true);
    expect(optimisationsFromUrl('?o1=0')).toEqual({ o1: false, o2: true, o3: true, o4: true });
    expect(optimisationsFromUrl('?bench&o1=0&o3=0')).toEqual({ o1: false, o2: true, o3: false, o4: true });
  });

  it('skips a layer only when its uniform is exactly zero', () => {
    expect(drawnLayers({ gasLevel: 0, galaxiesVisible: 0 }, true)).toEqual({ matter: false, galaxies: false });
    expect(drawnLayers({ gasLevel: Number.MIN_VALUE, galaxiesVisible: 1e-9 }, true)).toEqual({
      matter: true,
      galaxies: true,
    });
    expect(drawnLayers({ gasLevel: 0, galaxiesVisible: 0 }, false)).toEqual({ matter: true, galaxies: true });
  });

  it('never skips a layer at a control position where it contributes', () => {
    let skippedMatter = 0;
    let skippedGalaxies = 0;
    for (let i = 0; i <= 2000; i++) {
      const s = map.visualState(scale.timeAt(i / 2000));
      const drawn = drawnLayers(s, true);
      expect(drawn.matter).toBe(s.gasLevel !== 0);
      expect(drawn.galaxies).toBe(s.galaxiesVisible !== 0);
      if (!drawn.matter) skippedMatter++;
      if (!drawn.galaxies) skippedGalaxies++;
    }
    // The epochs before matter shows (plasma, recombination) are where it applies.
    expect(skippedMatter).toBeGreaterThan(0);
    expect(skippedGalaxies).toBeGreaterThan(0);
    for (const id of ['darkAges', 'firstStars', 'reionization', 'milkyWay', 'today']) {
      const e = epochs.find((x) => x.id === id)!;
      expect(drawnLayers(map.visualState(e.anchor), true).matter).toBe(true);
    }
  });

  it('relies on the shaders scaling all RGB by those uniforms', () => {
    // If either product changes, the exact-zero argument above must be redone.
    expect(MATTER_VERTEX_SHADER).toContain('vBright = uGas * fade * pow(shown, 1.35) * smoothstep(0.5, 4.0, r);');
    expect(GALAXIES_VERTEX_SHADER).toContain('vFade = (1.0 - smoothstep(0.32 * uBox, 0.48 * uBox, r)) * uVisible;');
    expect(MATTER_FRAGMENT_SHADER).toContain('fragColour = vec4(colour * vBright * disc, 1.0);');
    expect(GALAXIES_FRAGMENT_SHADER).toContain('fragColour = vec4(colour * vFade, 1.0);');
  });
});
