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
    const p2 = period * period;
    const latticeLen = period * p2;
    const lattice = new Float32Array(latticeLen);
    for (let idx = 0; idx < latticeLen; idx++) lattice[idx] = rand();
    const mask = period - 1;
    const pow2 = (period & mask) === 0;
    const wrap = pow2 ? (idx: number) => idx & mask : (idx: number) => idx % period;
    const gain = gains[octave]!;
    const scale = period / size;
    for (let z = 0; z < size; z++) {
      const fz = z * scale;
      const k = Math.floor(fz);
      const wz = quintic(fz - k);
      const k0 = wrap(k) * p2;
      const k1 = wrap(k + 1) * p2;
      const zOff = size * z;
      for (let y = 0; y < size; y++) {
        const fy = y * scale;
        const j = Math.floor(fy);
        const wy = quintic(fy - j);
        const j0 = wrap(j) * period;
        const j1 = wrap(j + 1) * period;
        const o00 = j0 + k0;
        const o10 = j1 + k0;
        const o01 = j0 + k1;
        const o11 = j1 + k1;
        const rowOff = size * (y + zOff);
        for (let x = 0; x < size; x++) {
          const fx = x * scale;
          const i = Math.floor(fx);
          const wx = quintic(fx - i);
          const i0 = wrap(i);
          const i1 = wrap(i + 1);
          const c00 = lattice[i0 + o00]! + wx * (lattice[i1 + o00]! - lattice[i0 + o00]!);
          const c10 = lattice[i0 + o10]! + wx * (lattice[i1 + o10]! - lattice[i0 + o10]!);
          const c01 = lattice[i0 + o01]! + wx * (lattice[i1 + o01]! - lattice[i0 + o01]!);
          const c11 = lattice[i0 + o11]! + wx * (lattice[i1 + o11]! - lattice[i0 + o11]!);
          const c0 = c00 + wy * (c10 - c00);
          const c1 = c01 + wy * (c11 - c01);
          out[x + rowOff]! += gain * (c0 + wz * (c1 - c0));
        }
      }
    }
  });
  // Stretch to the full byte range.
  let min = Infinity;
  let max = -Infinity;
  const total = out.length;
  for (let idx = 0; idx < total; idx++) {
    const v = out[idx]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const bytes = new Uint8Array(total);
  const scaleByte = 255 / (max - min);
  for (let idx = 0; idx < total; idx++) {
    bytes[idx] = Math.round((out[idx]! - min) * scaleByte);
  }
  return bytes;
}
