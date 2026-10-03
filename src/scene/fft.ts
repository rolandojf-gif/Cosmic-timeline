// Complex FFT on cubic grids whose side is a power of two. Pure.
//
// Data are split into real and imaginary Float64Arrays of length n³, index
// i + n (j + n k). The inverse transform is not normalised by 1/n³: callers
// that need the normalisation apply it.

/** In-place radix-2 FFT of `n` complex values read with a stride. */
function fft1d(re: Float64Array, im: Float64Array, offset: number, stride: number, n: number, inverse: boolean, cos: Float64Array, sin: Float64Array): void {
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = offset + i * stride;
      const b = offset + j * stride;
      let t = re[a]!;
      re[a] = re[b]!;
      re[b] = t;
      t = im[a]!;
      im[a] = im[b]!;
      im[b] = t;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step]!;
        const wi = sign * sin[k * step]!;
        const a = offset + (start + k) * stride;
        const b = a + half * stride;
        const xr = re[b]! * wr - im[b]! * wi;
        const xi = re[b]! * wi + im[b]! * wr;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
      }
    }
  }
}

/** In-place 3D FFT of an n³ grid (n a power of two). */
export function fft3d(re: Float64Array, im: Float64Array, n: number, inverse = false): void {
  if (n & (n - 1)) throw new Error('fft3d: n must be a power of two');
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) {
    cos[k] = Math.cos((2 * Math.PI * k) / n);
    sin[k] = Math.sin((2 * Math.PI * k) / n);
  }
  const n2 = n * n;
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) fft1d(re, im, n * (j + n * k), 1, n, inverse, cos, sin);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) fft1d(re, im, i + n2 * k, n, n, inverse, cos, sin);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) fft1d(re, im, i + n * j, n2, n, inverse, cos, sin);
}

/** Wavenumber index of grid position m along one axis: 0, 1, …, n/2 − 1, −n/2, …, −1. */
export const frequency = (m: number, n: number): number => (m < n / 2 ? m : m - n);
