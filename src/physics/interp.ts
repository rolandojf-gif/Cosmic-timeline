// Interpolation helpers: cubic Hermite segments and monotone (PCHIP) slopes.

/**
 * Index i such that xs[i] <= x < xs[i + 1], clamped to [0, xs.length - 2].
 * `xs` must be strictly increasing with at least two entries.
 */
export function findInterval(xs: ArrayLike<number>, x: number): number {
  let lo = 0;
  let hi = xs.length - 1;
  if (x <= xs[0]!) return 0;
  if (x >= xs[hi]!) return hi - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid]! <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Value of the cubic Hermite segment through (x0, y0, d0) and (x1, y1, d1) at x. */
export function hermite(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  x: number,
): number {
  const h = x1 - x0;
  const s = (x - x0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}

/** Derivative with respect to x of the same Hermite segment. */
export function hermiteDerivative(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  x: number,
): number {
  const h = x1 - x0;
  const s = (x - x0) / h;
  const s2 = s * s;
  const dh00 = 6 * s2 - 6 * s;
  const dh10 = 3 * s2 - 4 * s + 1;
  const dh01 = -6 * s2 + 6 * s;
  const dh11 = 3 * s2 - 2 * s;
  return (dh00 * y0 + dh01 * y1) / h + dh10 * d0 + dh11 * d1;
}

/**
 * Shape-preserving slopes (Fritsch–Carlson / PCHIP, as in Moler's `pchip`).
 * The interpolant is monotone wherever the data are, and has no overshoot at
 * local extrema.
 */
export function pchipSlopes(xs: ArrayLike<number>, ys: ArrayLike<number>): Float64Array {
  const n = xs.length;
  const d = new Float64Array(n);
  if (n < 2) return d;
  const h = new Float64Array(n - 1);
  const delta = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1]! - xs[i]!;
    delta[i] = (ys[i + 1]! - ys[i]!) / h[i]!;
  }
  if (n === 2) {
    d[0] = delta[0]!;
    d[1] = delta[0]!;
    return d;
  }
  for (let i = 1; i < n - 1; i++) {
    const a = delta[i - 1]!;
    const b = delta[i]!;
    if (a === 0 || b === 0 || Math.sign(a) !== Math.sign(b)) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i]! + h[i - 1]!;
      const w2 = h[i]! + 2 * h[i - 1]!;
      d[i] = (w1 + w2) / (w1 / a + w2 / b);
    }
  }
  d[0] = endSlope(h[0]!, h[1]!, delta[0]!, delta[1]!);
  d[n - 1] = endSlope(h[n - 2]!, h[n - 3]!, delta[n - 2]!, delta[n - 3]!);
  return d;
}

function endSlope(h0: number, h1: number, del0: number, del1: number): number {
  let d = ((2 * h0 + h1) * del0 - h0 * del1) / (h0 + h1);
  if (Math.sign(d) !== Math.sign(del0)) d = 0;
  else if (Math.sign(del0) !== Math.sign(del1) && Math.abs(d) > Math.abs(3 * del0)) d = 3 * del0;
  return d;
}

/** Monotone piecewise-cubic interpolant, constant outside the data range. */
export class Pchip {
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  private readonly ds: Float64Array;

  constructor(xs: ArrayLike<number>, ys: ArrayLike<number>) {
    if (xs.length !== ys.length || xs.length < 2) {
      throw new RangeError('Pchip needs two equal-length arrays with at least two points');
    }
    for (let i = 1; i < xs.length; i++) {
      if (!(xs[i]! > xs[i - 1]!)) throw new RangeError('Pchip abscissae must be strictly increasing');
    }
    this.xs = Float64Array.from(xs);
    this.ys = Float64Array.from(ys);
    this.ds = pchipSlopes(this.xs, this.ys);
  }

  get xMin(): number {
    return this.xs[0]!;
  }

  get xMax(): number {
    return this.xs[this.xs.length - 1]!;
  }

  evaluate(x: number): number {
    const last = this.xs.length - 1;
    if (x <= this.xs[0]!) return this.ys[0]!;
    if (x >= this.xs[last]!) return this.ys[last]!;
    const i = findInterval(this.xs, x);
    return hermite(
      this.xs[i]!,
      this.xs[i + 1]!,
      this.ys[i]!,
      this.ys[i + 1]!,
      this.ds[i]!,
      this.ds[i + 1]!,
      x,
    );
  }
}
