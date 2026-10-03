// Fixed-order Gauss–Legendre quadrature.

const GL5_NODES = [
  -0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664,
] as const;
const GL5_WEIGHTS = [
  0.23692688505618908, 0.47862867049936647, 0.5688888888888889, 0.47862867049936647,
  0.23692688505618908,
] as const;

/** ∫_{x0}^{x1} f(x) dx with 5-point Gauss–Legendre (exact for polynomials of degree ≤ 9). */
export function gaussLegendre5(f: (x: number) => number, x0: number, x1: number): number {
  const half = 0.5 * (x1 - x0);
  const mid = 0.5 * (x1 + x0);
  let sum = 0;
  for (let k = 0; k < 5; k++) {
    sum += GL5_WEIGHTS[k]! * f(mid + half * GL5_NODES[k]!);
  }
  return sum * half;
}

/** Composite 5-point Gauss–Legendre over `panels` equal sub-intervals. */
export function compositeGaussLegendre5(
  f: (x: number) => number,
  x0: number,
  x1: number,
  panels: number,
): number {
  const h = (x1 - x0) / panels;
  let sum = 0;
  for (let i = 0; i < panels; i++) {
    sum += gaussLegendre5(f, x0 + i * h, x0 + (i + 1) * h);
  }
  return sum;
}
