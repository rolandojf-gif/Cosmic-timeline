// Tileable 3D value noise: output geometry, byte range, periodicity across tile
// boundaries, deterministic seeding, and seed independence.

import { describe, expect, it } from 'vitest';
import { tileableNoise } from '../../src/scene/noise3d';

/** Helper: index into the flat size³ buffer using (x, y, z) coordinates. */
const idx = (x: number, y: number, z: number, size: number): number =>
  x + size * (y + size * z);

describe('tileableNoise', () => {
  // ── Output size ──────────────────────────────────────────────────────────
  // The function produces one byte per voxel in a size³ volume.
  it('returns a Uint8Array of length size³', () => {
    const data = tileableNoise(16);
    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(16 ** 3); // 4096
  });

  // ── Range ────────────────────────────────────────────────────────────────
  // After the min/max stretch the output must span the full byte range.
  it('contains values only in [0, 255] and spans the full range', () => {
    const data = tileableNoise(16);
    let min = 255;
    let max = 0;
    for (const v of data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    // The stretch maps the minimum to 0 and the maximum to 255.
    expect(min).toBe(0);
    expect(max).toBe(255);
  });

  // ── Periodicity / smoothness at tile boundary ────────────────────────────
  // Because every octave's lattice period divides the texture size, the noise
  // tiles seamlessly.  For a smooth (quintic-interpolated) field the values on
  // two adjacent z-faces should be close—within a small fraction of the byte
  // range.  We compare the z = 0 face with the z = 15 face (i.e. the last
  // slice before the wrap) at several sample points.
  it('is smooth across the z-boundary (z = 0 vs z = size − 1)', () => {
    // For size = 64 (the production resolution), all octave periods [4, 8, 16, 32]
    // divide the size, and quintic interpolation ensures smooth continuity across boundaries.
    const size = 64;
    const data = tileableNoise(size);
    const maxDelta = 25;
    const samples = [
      [0, 0],
      [4, 7],
      [8, 12],
      [15, 15],
      [31, 45],
      [63, 63],
      [20, 50],
      [11, 2],
    ];
    for (const [x, y] of samples) {
      const v0 = data[idx(x!, y!, 0, size)]!;
      const v1 = data[idx(x!, y!, size - 1, size)]!;
      expect(
        Math.abs(v0 - v1),
        `difference at (${x}, ${y}) across z-boundary: ${Math.abs(v0 - v1)}`,
      ).toBeLessThanOrEqual(maxDelta);
    }
  });

  // ── Deterministic ────────────────────────────────────────────────────────
  // Two calls with the same seed must produce byte-identical output.
  it('is deterministic for the same seed', () => {
    const a = tileableNoise(16, 123);
    const b = tileableNoise(16, 123);
    expect(a).toEqual(b);
  });

  // ── Different seeds ──────────────────────────────────────────────────────
  // Different seeds must produce at least some differing values; if every
  // element matched the PRNG would be broken.
  it('produces different output for different seeds', () => {
    const a = tileableNoise(16, 7);
    const b = tileableNoise(16, 42);
    let differ = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) differ++;
    }
    expect(differ).toBeGreaterThan(0);
  });
});
