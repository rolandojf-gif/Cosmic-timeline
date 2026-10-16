import { describe, expect, it } from 'vitest';
import { BufferGeometry, Int16BufferAttribute } from 'three';
import { gpuProbe, haloMode, indexedHaloGeometry } from '../../src/scene/haloProfiling';

describe('original-image halo profiler', () => {
  it('preserves approved default image and only enables diagnostics explicitly', () => {
    expect(haloMode('')).toBe('legacy');
    expect(haloMode('?haloMode=indexed')).toBe('indexed');
    expect(haloMode('?haloMode=other')).toBe('legacy');
    expect(gpuProbe('')).toBe('none');
    expect(gpuProbe('?gpuProbe=halos')).toBe('halos');
    expect(gpuProbe('?gpuProbe=bloom')).toBe('bloom');
    expect(gpuProbe('?gpuProbe=matter')).toBe('matter');
    expect(gpuProbe('?gpuProbe=galaxies')).toBe('galaxies');
    expect(gpuProbe('?gpuProbe=something')).toBe('none');
  });

  it('keeps exactly the same source vertices that the original halo shader draws', () => {
    const matter = new BufferGeometry();
    const pos = new Int16BufferAttribute(new Int16Array(3 * 64), 3, true);
    const lambda = new Int16BufferAttribute(new Int16Array(3 * 64), 3, true);
    matter.setAttribute('position', pos);
    matter.setAttribute('aLambda', lambda);
    const halo = indexedHaloGeometry(matter);
    expect(halo.getAttribute('position')).toBe(pos);
    expect(halo.getAttribute('aLambda')).toBe(lambda);
    expect([...halo.getIndex()!.array]).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);
    halo.dispose();
    matter.dispose();
  });

  it('rejects unexpected particle grids', () => {
    const matter = new BufferGeometry();
    matter.setAttribute('position', new Int16BufferAttribute(new Int16Array(21), 3, true));
    expect(() => indexedHaloGeometry(matter)).toThrow('multiple of eight');
  });
});
