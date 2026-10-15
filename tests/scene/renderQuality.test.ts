import { describe, expect, it } from 'vitest';
import { adaptedDpr, budgetFor, haloParticleIndex, profileFromSearch } from '../../src/scene/renderQuality';

describe('GPU render budgets', () => {
  it('defaults to balanced desktop and low mobile, with explicit overrides', () => {
    expect(profileFromSearch('', false)).toBe('balanced');
    expect(profileFromSearch('', true)).toBe('low');
    expect(profileFromSearch('?quality=high', true)).toBe('high');
    expect(profileFromSearch('?quality=balanced', true)).toBe('balanced');
    expect(profileFromSearch('?quality=low', false)).toBe('low');
  });

  it('orders workloads while preserving a cinematic opt-in', () => {
    const low = budgetFor('low');
    const balanced = budgetFor('balanced');
    const high = budgetFor('high');
    expect([low.n, balanced.n, high.n]).toEqual([48, 64, 128]);
    expect(low.raySteps).toBeLessThan(balanced.raySteps);
    expect(balanced.raySteps).toBeLessThan(high.raySteps);
    expect(low.bloom).toBe(false);
    expect(balanced.bloom).toBe(false);
    expect(high.bloom).toBe(true);
  });

  it('reduces resolution on slow frames, recovers on fast ones and leaves high unchanged', () => {
    const balanced = budgetFor('balanced');
    expect(adaptedDpr(1.15, 40, balanced)).toBe(1);
    expect(adaptedDpr(1, 24, balanced)).toBe(1);
    expect(adaptedDpr(1, 16, balanced)).toBe(1.1);
    expect(adaptedDpr(0.8, 50, balanced)).toBe(0.8);
    expect(adaptedDpr(1.5, 55, budgetFor('high'))).toBe(1.5);
  });

  it('distributes halo samples across eight-vertex groups without duplicates', () => {
    const indices = Array.from({ length: 1024 }, (_, j) => haloParticleIndex(j));
    expect(indices.every((i, j) => i >= 8 * j && i < 8 * (j + 1))).toBe(true);
    expect(new Set(indices).size).toBe(indices.length);
    expect(new Set(indices.map((i) => i % 8)).size).toBe(8);
  });
});
