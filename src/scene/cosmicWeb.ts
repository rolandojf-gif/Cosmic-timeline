// The cosmic web of the scene, from a Gaussian random field and the Zel'dovich
// approximation. Pure: no three.js, no DOM; meant to run in a worker.
//
// 1. A Gaussian random field δ(q) in a periodic box, with the linear matter
//    power spectrum P(k) ∝ k^n_s T(k)², T(k) the no-wiggle transfer function of
//    Eisenstein & Hu (1998), normalised to σ8 today.
// 2. Truncated Zel'dovich approximation (Coles, Melott & Shandarin 1993): the
//    field is smoothed on the non-linear scale and each particle moves from its
//    grid position q to x = q + D(a) ψ(q), with ∇·ψ = −δ.
// 3. The eigenvalues λ1 ≥ λ2 ≥ λ3 of the deformation tensor −∂ψ_i/∂q_j give
//    the density of each particle at any time, ρ/ρ̄ = 1 / Π (1 − D λ_i), and
//    whether it lies in a void, sheet, filament or knot (Zel'dovich 1970).
//
// Everything here is linear theory evaluated with the model's D(a); what the
// scene makes of it (brightness, colour, galaxies) is licence `structure`.

import { fft3d, frequency } from './fft';

export interface WebSpectrum {
  /** Ω_m today. */
  readonly omegaM: number;
  /** H0 / (100 km s⁻¹ Mpc⁻¹). */
  readonly h: number;
  /** Ω_b h². */
  readonly omegaBh2: number;
  /** CMB temperature today [K]. */
  readonly TCMB0: number;
  /** Scalar spectral index. */
  readonly ns: number;
  /** RMS density contrast in spheres of 8 Mpc/h today. */
  readonly sigma8: number;
}

export interface WebOptions {
  /** Grid points per axis (a power of two); n³ particles. */
  readonly n: number;
  /** Side of the periodic box [Mpc/h, comoving]. */
  readonly boxMpcH: number;
  /** Gaussian smoothing radius of the truncated Zel'dovich approximation [Mpc/h]. */
  readonly smoothingMpcH: number;
  readonly seed: number;
}

export interface CosmicWeb {
  readonly n: number;
  readonly boxMpcH: number;
  /** Zel'dovich displacement today, ψ(q) / box side, xyz interleaved. */
  readonly displacement: Float32Array;
  /** Eigenvalues λ1 ≥ λ2 ≥ λ3 of the deformation tensor today, interleaved. */
  readonly eigenvalues: Float32Array;
  /** Smoothed linear density contrast today at each grid point. */
  readonly delta: Float32Array;
  /** RMS of `delta`. */
  readonly sigma: number;
  /** Local maxima of `delta`, highest first: grid index and δ today. */
  readonly peaks: readonly { readonly index: number; readonly delta: number }[];
}

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

/**
 * No-wiggle transfer function of Eisenstein & Hu 1998 (ApJ 496, 605, eqs. 26,
 * 28–31), k in h/Mpc.
 */
export function transferNoWiggle(kh: number, s: WebSpectrum): number {
  const omh2 = s.omegaM * s.h * s.h;
  const fb = s.omegaBh2 / omh2;
  const theta = s.TCMB0 / 2.7;
  const k = kh * s.h; // Mpc⁻¹
  const soundHorizon = (44.5 * Math.log(9.83 / omh2)) / Math.sqrt(1 + 10 * s.omegaBh2 ** 0.75);
  const alpha = 1 - 0.328 * Math.log(431 * omh2) * fb + 0.38 * Math.log(22.3 * omh2) * fb * fb;
  const gammaEff = s.omegaM * s.h * (alpha + (1 - alpha) / (1 + (0.43 * k * soundHorizon) ** 4));
  const q = (kh * theta * theta) / gammaEff;
  const L0 = Math.log(2 * Math.E + 1.8 * q);
  const C0 = 14.2 + 731 / (1 + 62.5 * q);
  return L0 / (L0 + C0 * q * q);
}

/** Top-hat window in Fourier space. */
const topHat = (x: number): number => (x < 1e-4 ? 1 - (x * x) / 10 : (3 * (Math.sin(x) - x * Math.cos(x))) / (x * x * x));

/** Eigenvalues of a symmetric 3×3 matrix, descending (Smith 1961). */
function symmetricEigenvalues(a: number, b: number, c: number, d: number, e: number, f: number, out: Float32Array, at: number): void {
  // Matrix [[a, d, f], [d, b, e], [f, e, c]].
  const p1 = d * d + e * e + f * f;
  const q = (a + b + c) / 3;
  const p2 = (a - q) ** 2 + (b - q) ** 2 + (c - q) ** 2 + 2 * p1;
  if (p2 < 1e-30) {
    out[at] = out[at + 1] = out[at + 2] = q;
    return;
  }
  const p = Math.sqrt(p2 / 6);
  const ba = (a - q) / p, bb = (b - q) / p, bc = (c - q) / p, bd = d / p, be = e / p, bf = f / p;
  const det = ba * (bb * bc - be * be) - bd * (bd * bc - be * bf) + bf * (bd * be - bb * bf);
  const r = Math.min(1, Math.max(-1, det / 2));
  const phi = Math.acos(r) / 3;
  const l1 = q + 2 * p * Math.cos(phi);
  const l3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  out[at] = l1;
  out[at + 1] = 3 * q - l1 - l3;
  out[at + 2] = l3;
}

export function createCosmicWeb(spectrum: WebSpectrum, options: WebOptions): CosmicWeb {
  const { n, boxMpcH, smoothingMpcH, seed } = options;
  const n3 = n * n * n;
  const rand = random(seed);

  // White noise, unit variance per cell.
  const re = new Float64Array(n3);
  const im = new Float64Array(n3);
  for (let i = 0; i < n3; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - rand()));
    const angle = 2 * Math.PI * rand();
    re[i] = r * Math.cos(angle);
    if (i + 1 < n3) re[i + 1] = r * Math.sin(angle);
  }
  fft3d(re, im, n);

  // Shape √P(k), and the amplitude that gives σ8: for δ_k = W_k S(k) with unit
  // white noise W, the expected variance of δ(x) filtered by w(k) is
  // (1/n³) Σ_k S(k)² w(k)².
  const fundamental = (2 * Math.PI) / boxMpcH;
  const shape = new Float64Array(n3);
  let variance8 = 0;
  for (let k3 = 0; k3 < n; k3++) {
    const kz = frequency(k3, n) * fundamental;
    for (let k2 = 0; k2 < n; k2++) {
      const ky = frequency(k2, n) * fundamental;
      for (let k1 = 0; k1 < n; k1++) {
        const kx = frequency(k1, n) * fundamental;
        const index = k1 + n * (k2 + n * k3);
        const k = Math.sqrt(kx * kx + ky * ky + kz * kz);
        if (k === 0) continue;
        const s = Math.sqrt(k ** spectrum.ns) * transferNoWiggle(k, spectrum);
        shape[index] = s;
        variance8 += s * s * topHat(8 * k) ** 2;
      }
    }
  }
  const amplitude = spectrum.sigma8 / Math.sqrt(variance8 / n3);

  // ψ_k = i k δ_k / k², smoothed; packed two real fields per complex transform:
  // (ψx + i ψy) and (ψz + i δ).
  const aRe = new Float64Array(n3), aIm = new Float64Array(n3);
  const bRe = new Float64Array(n3), bIm = new Float64Array(n3);
  for (let k3 = 0; k3 < n; k3++) {
    const kz = frequency(k3, n) * fundamental;
    for (let k2 = 0; k2 < n; k2++) {
      const ky = frequency(k2, n) * fundamental;
      for (let k1 = 0; k1 < n; k1++) {
        const kx = frequency(k1, n) * fundamental;
        const index = k1 + n * (k2 + n * k3);
        const k2sum = kx * kx + ky * ky + kz * kz;
        // The mean, and the Nyquist planes, whose odd ik factor is not Hermitian.
        if (k2sum === 0 || k1 === n / 2 || k2 === n / 2 || k3 === n / 2) continue;
        const g = amplitude * shape[index]! * Math.exp(-0.5 * k2sum * smoothingMpcH * smoothingMpcH);
        const dr = re[index]! * g; // δ_k
        const di = im[index]! * g;
        // i k/k² δ_k = (−di + i dr) k/k²
        const cx = kx / k2sum, cy = ky / k2sum, cz = kz / k2sum;
        // ψx + i ψy: (ψx_k) + i (ψy_k)
        aRe[index] = -di * cx - dr * cy;
        aIm[index] = dr * cx - di * cy;
        // ψz + i δ
        bRe[index] = -di * cz - di;
        bIm[index] = dr * cz + dr;
      }
    }
  }
  fft3d(aRe, aIm, n, true);
  fft3d(bRe, bIm, n, true);

  const displacement = new Float32Array(3 * n3);
  const delta = new Float32Array(n3);
  let sum2 = 0;
  for (let i = 0; i < n3; i++) {
    displacement[3 * i] = aRe[i]! / n3 / boxMpcH;
    displacement[3 * i + 1] = aIm[i]! / n3 / boxMpcH;
    displacement[3 * i + 2] = bRe[i]! / n3 / boxMpcH;
    const d = bIm[i]! / n3;
    delta[i] = d;
    sum2 += d * d;
  }

  // Deformation tensor −∂ψ_i/∂q_j by central differences (ψ in box units,
  // q in box units: spacing 1/n).
  const eigenvalues = new Float32Array(3 * n3);
  const at = (i: number, j: number, k: number): number => ((i + n) % n) + n * (((j + n) % n) + n * ((k + n) % n));
  const h = n / 2; // 1 / (2 Δq)
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const xp = 3 * at(i + 1, j, k), xm = 3 * at(i - 1, j, k);
        const yp = 3 * at(i, j + 1, k), ym = 3 * at(i, j - 1, k);
        const zp = 3 * at(i, j, k + 1), zm = 3 * at(i, j, k - 1);
        const dxx = -(displacement[xp]! - displacement[xm]!) * h;
        const dyy = -(displacement[yp + 1]! - displacement[ym + 1]!) * h;
        const dzz = -(displacement[zp + 2]! - displacement[zm + 2]!) * h;
        const dxy = -0.5 * ((displacement[yp]! - displacement[ym]!) + (displacement[xp + 1]! - displacement[xm + 1]!)) * h;
        const dyz = -0.5 * ((displacement[zp + 1]! - displacement[zm + 1]!) + (displacement[yp + 2]! - displacement[ym + 2]!)) * h;
        const dxz = -0.5 * ((displacement[zp]! - displacement[zm]!) + (displacement[xp + 2]! - displacement[xm + 2]!)) * h;
        symmetricEigenvalues(dxx, dyy, dzz, dxy, dyz, dxz, eigenvalues, 3 * (i + n * (j + n * k)));
      }
    }
  }

  // Local maxima of δ in the 26-neighbourhood.
  const peaks: { index: number; delta: number }[] = [];
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const index = i + n * (j + n * k);
        const d = delta[index]!;
        if (d <= 0) continue;
        let isPeak = true;
        for (let dk = -1; dk <= 1 && isPeak; dk++)
          for (let dj = -1; dj <= 1 && isPeak; dj++)
            for (let di = -1; di <= 1; di++) {
              if ((di || dj || dk) && delta[at(i + di, j + dj, k + dk)]! >= d) {
                isPeak = false;
                break;
              }
            }
        if (isPeak) peaks.push({ index, delta: d });
      }
    }
  }
  peaks.sort((x, y) => y.delta - x.delta);

  return { n, boxMpcH, displacement, eigenvalues, delta, sigma: Math.sqrt(sum2 / n3), peaks };
}
