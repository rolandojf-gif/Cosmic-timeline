// These tests use small grids (n=16) for speed; the scene uses n=128.
//
// The cosmic web: Gaussian random field → Zel'dovich displacement, deformation
// eigenvalues, smoothed δ, and local peaks. Pure numerics, no DOM or three.js.

import { describe, expect, it } from 'vitest';
import {
  type CosmicWeb,
  type WebOptions,
  type WebSpectrum,
  createCosmicWeb,
  transferNoWiggle,
} from '../../src/scene/cosmicWeb';

// Planck 2018 best-fit cosmology (TT,TE,EE+lowE+lensing, table 2).
const spectrum: WebSpectrum = {
  omegaM: 0.3111,
  h: 0.6766,
  omegaBh2: 0.02242,
  TCMB0: 2.7255,
  ns: 0.9665,
  sigma8: 0.8102,
};

const opts16: WebOptions = { n: 16, boxMpcH: 200, smoothingMpcH: 2, seed: 42 };
const opts32: WebOptions = { n: 32, boxMpcH: 200, smoothingMpcH: 2, seed: 42 };

// Precompute the n=16 web once for all tests that share these parameters.
let web16: CosmicWeb;
function getWeb16(): CosmicWeb {
  if (!web16) web16 = createCosmicWeb(spectrum, opts16);
  return web16;
}

// --------------------------------------------------------------------------
// Transfer function
// --------------------------------------------------------------------------

describe('transfer function T(k)', () => {
  it('T(k → 0) → 1: the transfer function is normalised to unity at large scales', () => {
    // At very small k the transfer function should return ~1 (no suppression).
    const T = transferNoWiggle(1e-4, spectrum);
    expect(T).toBeGreaterThan(0.95);
    expect(T).toBeLessThan(1.05);
  });

  it('T(k) is monotonically decreasing from k = 0.001 to k = 10 h/Mpc', () => {
    // Small-scale perturbations entered the horizon earlier and were suppressed
    // more, so the no-wiggle transfer function must fall with rising k.
    const kValues: number[] = [];
    const logMin = Math.log10(0.001);
    const logMax = Math.log10(10);
    for (let i = 0; i < 20; i++) {
      kValues.push(10 ** (logMin + (logMax - logMin) * (i / 19)));
    }
    const Tvalues = kValues.map((k) => transferNoWiggle(k, spectrum));
    for (let i = 1; i < Tvalues.length; i++) {
      expect(Tvalues[i]!).toBeLessThan(Tvalues[i - 1]!);
    }
  });

  it('T(k) > 0 for all k > 0', () => {
    // The transfer function is strictly positive—perturbations are suppressed
    // but never inverted.
    for (const k of [1e-6, 1e-3, 0.01, 0.1, 1, 10, 100, 1000]) {
      expect(transferNoWiggle(k, spectrum)).toBeGreaterThan(0);
    }
  });
});

// --------------------------------------------------------------------------
// σ₈ normalisation
// --------------------------------------------------------------------------

describe('σ₈ normalisation', () => {
  it('sigma on n=32 grid is in a plausible range (0.3–1.5)', () => {
    // A 32³ grid in a 200 Mpc/h box cannot resolve the 8 Mpc/h smoothing scale
    // perfectly, so the measured σ won't match σ₈ = 0.8102 exactly. But it
    // should be in the right ballpark—not orders of magnitude off.
    const web = createCosmicWeb(spectrum, opts32);
    expect(web.sigma).toBeGreaterThan(0.3);
    expect(web.sigma).toBeLessThan(1.5);
  });
});

// --------------------------------------------------------------------------
// Eigenvalue ordering
// --------------------------------------------------------------------------

describe('eigenvalue ordering', () => {
  it('λ₁ ≥ λ₂ ≥ λ₃ at every grid point (descending sort)', () => {
    // The deformation tensor eigenvalues classify structure type (void, sheet,
    // filament, knot) so they must be returned in descending order.
    const web = getWeb16();
    const n3 = web.n ** 3;
    for (let i = 0; i < n3; i++) {
      const l1 = web.eigenvalues[3 * i]!;
      const l2 = web.eigenvalues[3 * i + 1]!;
      const l3 = web.eigenvalues[3 * i + 2]!;
      expect(l1).toBeGreaterThanOrEqual(l2 - 1e-6);
      expect(l2).toBeGreaterThanOrEqual(l3 - 1e-6);
    }
  });
});

// --------------------------------------------------------------------------
// Eigenvalue symmetry (trace = −δ, mean ≈ 0)
// --------------------------------------------------------------------------

describe('eigenvalue symmetry', () => {
  it('mean trace (λ₁ + λ₂ + λ₃) is close to 0', () => {
    // The trace of the deformation tensor equals −δ, whose spatial mean over a
    // periodic box should vanish (the DC mode is zeroed). We allow a tolerance
    // relative to the largest eigenvalue to account for finite-difference errors.
    const web = getWeb16();
    const n3 = web.n ** 3;
    let sumTrace = 0;
    let maxEig = 0;
    for (let i = 0; i < n3; i++) {
      const l1 = web.eigenvalues[3 * i]!;
      const l2 = web.eigenvalues[3 * i + 1]!;
      const l3 = web.eigenvalues[3 * i + 2]!;
      sumTrace += l1 + l2 + l3;
      maxEig = Math.max(maxEig, Math.abs(l1));
    }
    const meanTrace = sumTrace / n3;
    // The mean should be much smaller than the typical eigenvalue magnitude.
    expect(Math.abs(meanTrace)).toBeLessThan(0.1 * maxEig);
  });
});

// --------------------------------------------------------------------------
// Peaks
// --------------------------------------------------------------------------

describe('peaks', () => {
  it('peaks are sorted by descending δ', () => {
    // The caller (galaxy placement) expects the highest peaks first.
    const web = getWeb16();
    for (let i = 1; i < web.peaks.length; i++) {
      expect(web.peaks[i - 1]!.delta).toBeGreaterThanOrEqual(web.peaks[i]!.delta);
    }
  });

  it('all peaks have δ > 0', () => {
    // Peaks are local maxima of δ; only overdense maxima (δ > 0) qualify.
    const web = getWeb16();
    expect(web.peaks.length).toBeGreaterThan(0);
    for (const peak of web.peaks) {
      expect(peak.delta).toBeGreaterThan(0);
    }
  });
});

// --------------------------------------------------------------------------
// Determinism
// --------------------------------------------------------------------------

describe('deterministic', () => {
  it('same seed produces identical sigma and peak count', () => {
    // The PRNG is seeded, so the entire web must be reproducible.
    const a = createCosmicWeb(spectrum, opts16);
    const b = createCosmicWeb(spectrum, opts16);
    expect(b.sigma).toBe(a.sigma);
    expect(b.peaks.length).toBe(a.peaks.length);
  });
});

// --------------------------------------------------------------------------
// Displacement bounds
// --------------------------------------------------------------------------

describe('displacement bounds', () => {
  it('all displacement components are within [−1, 1] box units', () => {
    // Displacements are stored as ψ/box; for a well-smoothed linear field on a
    // 200 Mpc/h box they should stay well under 1 box length.
    const web = getWeb16();
    for (let i = 0; i < web.displacement.length; i++) {
      expect(web.displacement[i]!).toBeGreaterThanOrEqual(-1);
      expect(web.displacement[i]!).toBeLessThanOrEqual(1);
    }
  });
});
