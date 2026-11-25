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
  /** Optional pre-quantised GPU attributes built off the main thread. */
  readonly psiInt16?: Int16Array;
  readonly lambdaInt16?: Int16Array;
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
function createTransferNoWiggle(s: WebSpectrum): (kh: number) => number {
  const omh2 = s.omegaM * s.h * s.h;
  const fb = s.omegaBh2 / omh2;
  const theta2 = (s.TCMB0 / 2.7) ** 2;
  const soundHorizon = (44.5 * Math.log(9.83 / omh2)) / Math.sqrt(1 + 10 * s.omegaBh2 ** 0.75);
  const alpha = 1 - 0.328 * Math.log(431 * omh2) * fb + 0.38 * Math.log(22.3 * omh2) * fb * fb;
  const omh = s.omegaM * s.h;
  const kScale = 0.43 * s.h * soundHorizon;
  const twoE = 2 * Math.E;
  return (kh: number): number => {
    const ks = kScale * kh;
    const ks2 = ks * ks;
    const gammaEff = omh * (alpha + (1 - alpha) / (1 + ks2 * ks2));
    const q = (kh * theta2) / gammaEff;
    const L0 = Math.log(twoE + 1.8 * q);
    const C0 = 14.2 + 731 / (1 + 62.5 * q);
    return L0 / (L0 + C0 * q * q);
  };
}

export function transferNoWiggle(kh: number, s: WebSpectrum): number {
  return createTransferNoWiggle(s)(kh);
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
  const transfer = createTransferNoWiggle(spectrum);
  const halfNs = 0.5 * spectrum.ns;
  const shape = new Float64Array(n3);
  let variance8 = 0;
  for (let k3 = 0; k3 < n; k3++) {
    const kz = frequency(k3, n) * fundamental;
    const kz2 = kz * kz;
    for (let k2 = 0; k2 < n; k2++) {
      const ky = frequency(k2, n) * fundamental;
      const kyz2 = ky * ky + kz2;
      const rowOff = n * (k2 + n * k3);
      for (let k1 = 0; k1 < n; k1++) {
        const kx = frequency(k1, n) * fundamental;
        const k2sum = kx * kx + kyz2;
        if (k2sum === 0) continue;
        const k = Math.sqrt(k2sum);
        const s = Math.pow(k, halfNs) * transfer(k);
        shape[k1 + rowOff] = s;
        const w = topHat(8 * k);
        variance8 += s * s * w * w;
      }
    }
  }
  const amplitude = spectrum.sigma8 / Math.sqrt(variance8 / n3);

  // ψ_k = i k δ_k / k², smoothed; packed two real fields per complex transform:
  // (ψx + i ψy) reused in-place inside (re, im) to save 32 MB at 128³, and (ψz + i δ) in (bRe, bIm).
  const bRe = new Float64Array(n3);
  const bIm = new Float64Array(n3);
  const halfSmooth2 = -0.5 * smoothingMpcH * smoothingMpcH;
  const halfN = n >> 1;
  for (let k3 = 0; k3 < n; k3++) {
    const kz = frequency(k3, n) * fundamental;
    const kz2 = kz * kz;
    const nyq3 = k3 === halfN;
    for (let k2 = 0; k2 < n; k2++) {
      const ky = frequency(k2, n) * fundamental;
      const kyz2 = ky * ky + kz2;
      const nyq23 = nyq3 || k2 === halfN;
      const rowOff = n * (k2 + n * k3);
      for (let k1 = 0; k1 < n; k1++) {
        const index = k1 + rowOff;
        const kx = frequency(k1, n) * fundamental;
        const k2sum = kx * kx + kyz2;
        // The mean, and the Nyquist planes, whose odd ik factor is not Hermitian.
        if (k2sum === 0 || nyq23 || k1 === halfN) {
          re[index] = 0;
          im[index] = 0;
          continue;
        }
        const g = amplitude * shape[index]! * Math.exp(halfSmooth2 * k2sum);
        const dr = re[index]! * g; // δ_k
        const di = im[index]! * g;
        // i k/k² δ_k = (−di + i dr) k/k²
        const invK2 = 1 / k2sum;
        const cx = kx * invK2;
        const cy = ky * invK2;
        const cz = kz * invK2;
        // ψx + i ψy: (ψx_k) + i (ψy_k)
        re[index] = -di * cx - dr * cy;
        im[index] = dr * cx - di * cy;
        // ψz + i δ
        bRe[index] = -di * cz - di;
        bIm[index] = dr * cz + dr;
      }
    }
  }
  fft3d(re, im, n, true);
  fft3d(bRe, bIm, n, true);

  const displacement = new Float32Array(3 * n3);
  const delta = new Float32Array(n3);
  const invN3 = 1 / n3;
  const invN3Box = invN3 / boxMpcH;
  let sum2 = 0;
  for (let i = 0; i < n3; i++) {
    displacement[3 * i] = re[i]! * invN3Box;
    displacement[3 * i + 1] = im[i]! * invN3Box;
    displacement[3 * i + 2] = bRe[i]! * invN3Box;
    const d = bIm[i]! * invN3;
    delta[i] = d;
    sum2 += d * d;
  }

  // Deformation tensor −∂ψ_i/∂q_j by central differences (ψ in box units,
  // q in box units: spacing 1/n). n is a power of two (enforced by fft3d).
  const eigenvalues = new Float32Array(3 * n3);
  const mask = n - 1;
  const n2 = n * n;
  const h = n / 2; // 1 / (2 Δq)
  for (let k = 0; k < n; k++) {
    const kOff = k * n2;
    const kpOff = ((k + 1) & mask) * n2;
    const kmOff = ((k - 1) & mask) * n2;
    for (let j = 0; j < n; j++) {
      const jOff = j * n;
      const jpOff = ((j + 1) & mask) * n;
      const jmOff = ((j - 1) & mask) * n;
      const jkOff = jOff + kOff;
      const jpkOff = jpOff + kOff;
      const jmkOff = jmOff + kOff;
      const jkpOff = jOff + kpOff;
      const jkmOff = jOff + kmOff;
      for (let i = 0; i < n; i++) {
        const ip = (i + 1) & mask;
        const imIdx = (i - 1) & mask;
        const xp = 3 * (ip + jkOff);
        const xm = 3 * (imIdx + jkOff);
        const yp = 3 * (i + jpkOff);
        const ym = 3 * (i + jmkOff);
        const zp = 3 * (i + jkpOff);
        const zm = 3 * (i + jkmOff);
        const dxx = -(displacement[xp]! - displacement[xm]!) * h;
        const dyy = -(displacement[yp + 1]! - displacement[ym + 1]!) * h;
        const dzz = -(displacement[zp + 2]! - displacement[zm + 2]!) * h;
        const dxy = -0.5 * ((displacement[yp]! - displacement[ym]!) + (displacement[xp + 1]! - displacement[xm + 1]!)) * h;
        const dyz = -0.5 * ((displacement[zp + 1]! - displacement[zm + 1]!) + (displacement[yp + 2]! - displacement[ym + 2]!)) * h;
        const dxz = -0.5 * ((displacement[zp]! - displacement[zm]!) + (displacement[xp + 2]! - displacement[xm + 2]!)) * h;
        symmetricEigenvalues(dxx, dyy, dzz, dxy, dyz, dxz, eigenvalues, 3 * (i + jkOff));
      }
    }
  }

  // Local maxima of δ in the 26-neighbourhood.
  const peaks: { index: number; delta: number }[] = [];
  for (let k = 0; k < n; k++) {
    const k0 = ((k - 1) & mask) * n2;
    const k1 = k * n2;
    const k2 = ((k + 1) & mask) * n2;
    for (let j = 0; j < n; j++) {
      const j0 = ((j - 1) & mask) * n;
      const j1 = j * n;
      const j2 = ((j + 1) & mask) * n;
      const rowOff = j1 + k1;
      for (let i = 0; i < n; i++) {
        const index = i + rowOff;
        const d = delta[index]!;
        if (d <= 0) continue;
        const i0 = (i - 1) & mask;
        const i2 = (i + 1) & mask;
        // Fast 6-face check eliminates >90% of non-peaks before scanning diagonals.
        if (
          delta[i0 + rowOff]! >= d ||
          delta[i2 + rowOff]! >= d ||
          delta[i + j0 + k1]! >= d ||
          delta[i + j2 + k1]! >= d ||
          delta[i + j1 + k0]! >= d ||
          delta[i + j1 + k2]! >= d
        ) {
          continue;
        }
        let isPeak = true;
        for (let dk = -1; dk <= 1 && isPeak; dk++) {
          const ko = dk === -1 ? k0 : dk === 0 ? k1 : k2;
          for (let dj = -1; dj <= 1 && isPeak; dj++) {
            const jko = (dj === -1 ? j0 : dj === 0 ? j1 : j2) + ko;
            if (
              (i0 + jko !== index && delta[i0 + jko]! >= d) ||
              (i + jko !== index && delta[i + jko]! >= d) ||
              (i2 + jko !== index && delta[i2 + jko]! >= d)
            ) {
              isPeak = false;
            }
          }
        }
        if (isPeak) peaks.push({ index, delta: d });
      }
    }
  }
  peaks.sort((x, y) => y.delta - x.delta);

  return { n, boxMpcH, displacement, eigenvalues, delta, sigma: Math.sqrt(sum2 / n3), peaks };
}
