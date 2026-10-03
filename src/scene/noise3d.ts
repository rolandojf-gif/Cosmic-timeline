// Tileable 3D noise for the plasma and the microwave-background sky, baked once
// into a texture (licence `plasma`): illustrative turbulence, not data. Pure.

/** Mulberry32: small, fast, seeded PRNG. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quintic = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Periodic value noise in [0, 1], `size`³ samples, sum of octaves whose lattice
 * periods divide `size` (so the texture tiles with linear filtering).
 */
export function tileableNoise(size: number, seed = 7, periods: readonly number[] = [4, 8, 16, 32], gains: readonly number[] = [0.5, 0.25, 0.15, 0.1]): Uint8Array {
  const rand = random(seed);
  const out = new Float32Array(size * size * size);
  periods.forEach((period, octave) => {
    const lattice = Float32Array.from({ length: period ** 3 }, () => rand());
    const at = (i: number, j: number, k: number): number =>
      lattice[(i % period) + period * ((j % period) + period * (k % period))]!;
    const gain = gains[octave]!;
    for (let z = 0; z < size; z++) {
      const fz = (z * period) / size;
      const k = Math.floor(fz);
      const wz = quintic(fz - k);
      for (let y = 0; y < size; y++) {
        const fy = (y * period) / size;
        const j = Math.floor(fy);
        const wy = quintic(fy - j);
        for (let x = 0; x < size; x++) {
          const fx = (x * period) / size;
          const i = Math.floor(fx);
          const wx = quintic(fx - i);
          const c00 = at(i, j, k) + wx * (at(i + 1, j, k) - at(i, j, k));
          const c10 = at(i, j + 1, k) + wx * (at(i + 1, j + 1, k) - at(i, j + 1, k));
          const c01 = at(i, j, k + 1) + wx * (at(i + 1, j, k + 1) - at(i, j, k + 1));
          const c11 = at(i, j + 1, k + 1) + wx * (at(i + 1, j + 1, k + 1) - at(i, j + 1, k + 1));
          const c0 = c00 + wy * (c10 - c00);
          const c1 = c01 + wy * (c11 - c01);
          out[x + size * (y + size * z)]! += gain * (c0 + wz * (c1 - c0));
        }
      }
    }
  });
  // Stretch to the full byte range.
  let min = Infinity;
  let max = -Infinity;
  for (const v of out) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return Uint8Array.from(out, (v) => Math.round((255 * (v - min)) / (max - min)));
}
