// 3D FFT: round-trip fidelity, spectral identities, and edge cases.

import { describe, expect, it } from 'vitest';
import { fft3d, frequency } from '../../src/scene/fft';

/** Deterministic seeded PRNG (LCG) for reproducible test data. */
function makeRng(initial = 42) {
  let seed = initial;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe('fft3d', () => {
  it('round-trips a random 8³ field to within 1e-10', () => {
    // Forward FFT followed by inverse FFT should recover the original signal
    // (after dividing by n³, since the inverse is unnormalised).
    const n = 8;
    const len = n ** 3;
    const rand = makeRng();

    const reOrig = Float64Array.from({ length: len }, () => rand());
    const imOrig = Float64Array.from({ length: len }, () => rand());
    const re = reOrig.slice();
    const im = imOrig.slice();

    fft3d(re, im, n);          // forward
    fft3d(re, im, n, true);    // inverse (unnormalised)

    for (let i = 0; i < len; i++) {
      re[i] = re[i]! / len;
      im[i] = im[i]! / len;
    }

    for (let i = 0; i < len; i++) {
      expect(re[i]).toBeCloseTo(reOrig[i]!, 10);
      expect(im[i]).toBeCloseTo(imOrig[i]!, 10);
    }
  });

  it('transforms a delta function into a flat spectrum', () => {
    // δ(0) in real space → constant 1 in frequency space.
    // All real parts should be 1.0, all imaginary parts 0.0.
    const n = 4;
    const len = n ** 3;
    const re = new Float64Array(len);
    const im = new Float64Array(len);
    re[0] = 1;

    fft3d(re, im, n);

    for (let i = 0; i < len; i++) {
      expect(re[i]).toBeCloseTo(1.0, 12);
      expect(im[i]).toBeCloseTo(0.0, 12);
    }
  });

  it("satisfies Parseval's theorem for a random 8³ field", () => {
    // Energy in real space equals (1/n³) × energy in frequency space.
    // Σ|x|² = (1/N) Σ|X|²  where N = n³.
    const n = 8;
    const len = n ** 3;
    const rand = makeRng();

    const re = Float64Array.from({ length: len }, () => rand());
    const im = Float64Array.from({ length: len }, () => rand());

    // Real-space energy.
    let realEnergy = 0;
    for (let i = 0; i < len; i++) {
      realEnergy += re[i]! * re[i]! + im[i]! * im[i]!;
    }

    // Transform to frequency space (in-place).
    fft3d(re, im, n);

    // Frequency-space energy.
    let freqEnergy = 0;
    for (let i = 0; i < len; i++) {
      freqEnergy += re[i]! * re[i]! + im[i]! * im[i]!;
    }

    expect(realEnergy).toBeCloseTo(freqEnergy / len, 8);
  });

  it('throws on non-power-of-two grid size', () => {
    // n = 6 is not a power of two; the implementation must reject it.
    const re = new Float64Array(216);
    const im = new Float64Array(216);
    expect(() => fft3d(re, im, 6)).toThrow();
  });
});

describe('frequency', () => {
  it('maps grid indices to signed wavenumbers', () => {
    // For n = 8 the frequencies are 0, 1, 2, 3, −4, −3, −2, −1.
    expect(frequency(0, 8)).toBe(0);
    expect(frequency(3, 8)).toBe(3);
    expect(frequency(4, 8)).toBe(-4);
    expect(frequency(7, 8)).toBe(-1);
  });
});
