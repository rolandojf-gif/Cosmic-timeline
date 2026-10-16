import { describe, it, expect } from 'vitest';
import { BufferGeometry, Int16BufferAttribute } from 'three';
import { buildSparseHaloGeometry, scenePixelRatio } from '../../src/scene/haloBudget';

describe('full-density scene GPU budget', () => {
  it('keeps the exact one-in-eight original halo indices and shared source data', () => {
    const source = new BufferGeometry();
    const pos = new Int16BufferAttribute(new Int16Array(3 * 64), 3, true);
    const lambda = new Int16BufferAttribute(new Int16Array(3 * 64), 3, true);
    source.setAttribute('position', pos);
    source.setAttribute('aLambda', lambda);
    const halo = buildSparseHaloGeometry(source);
    expect(halo.getAttribute('position')).toBe(pos);
    expect(halo.getAttribute('aLambda')).toBe(lambda);
    expect(halo.getIndex()!.count).toBe(8);
    const indices = halo.getIndex()!.array;
    expect([...indices]).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);
    expect([...indices].every((i) => i % 8 === 0)).toBe(true);
    halo.dispose();
    source.dispose();
  });

  it('never discards main geometry or invents an invalid halo grid', () => {
    const source = new BufferGeometry();
    source.setAttribute('position', new Int16BufferAttribute(new Int16Array(3 * 7), 3, true));
    expect(() => buildSparseHaloGeometry(source)).toThrow(/divisible by eight/);
  });

  it('caps physical pixel ratio without affecting the scene or bloom shaders', () => {
    expect(scenePixelRatio(2, false, '')).toBe(1.25);
    expect(scenePixelRatio(1.5, false, '')).toBe(1.25);
    expect(scenePixelRatio(1, false, '')).toBe(1);
    expect(scenePixelRatio(3, true, '')).toBe(1.5);
    expect(scenePixelRatio(2, false, '?dprcap=2')).toBe(2);
    expect(scenePixelRatio(2, false, '?dprcap=1.5')).toBe(1.5);
    expect(scenePixelRatio(2, false, '?dprcap=bogus')).toBe(1.25);
  });
});
