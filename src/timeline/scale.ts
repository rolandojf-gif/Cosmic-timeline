// Mapping between the time control position u ∈ [0, 1] and cosmic time t.
//
// Declared visual licence: the control is logarithmic by segments, not purely
// logarithmic. The anchors of the epochs sit at fixed positions; between two
// anchors log10 t varies linearly with u. A pure log10 t control would put the
// Solar System, the Earth and today in the last 0.3% of its length.
//
// Segment widths blend true logarithmic length with an equal share:
//   w_i = (1 − s) · Δ_i / Σ Δ + s / n,   Δ_i = log10(t_{i+1} / t_i)
// so no segment is narrower than s/n of the control.

export interface TimeScale {
  /** Anchor times [s], strictly increasing. */
  readonly anchors: readonly number[];
  /** Control positions of the anchors: 0 for the first, 1 for the last. */
  readonly positions: readonly number[];
  /** Cosmic time [s] at control position u ∈ [0, 1] (clamped). */
  timeAt(u: number): number;
  /** Control position of time t [s] (clamped to the anchors' range). */
  positionOf(t: number): number;
}

/** Fraction of the control shared equally between segments. */
export const DEFAULT_EQUAL_SHARE = 0.6;

export function createTimeScale(
  anchors: readonly number[],
  equalShare: number = DEFAULT_EQUAL_SHARE,
): TimeScale {
  if (anchors.length < 2) throw new RangeError('a time scale needs at least two anchors');
  if (!(equalShare >= 0 && equalShare <= 1)) throw new RangeError('equalShare must be in [0, 1]');
  for (let i = 0; i < anchors.length; i++) {
    const t = anchors[i]!;
    if (!(t > 0 && Number.isFinite(t))) throw new RangeError(`anchor ${i} must be a positive time`);
    if (i > 0 && !(t > anchors[i - 1]!)) throw new RangeError('anchors must be strictly increasing');
  }

  const logs = anchors.map(Math.log10);
  const n = anchors.length - 1;
  const decades = logs.slice(1).map((l, i) => l - logs[i]!);
  const total = decades.reduce((sum, d) => sum + d, 0);
  const widths = decades.map((d) => ((1 - equalShare) * d) / total + equalShare / n);

  const positions = [0];
  for (const w of widths) positions.push(positions[positions.length - 1]! + w);
  // Remove accumulated rounding so the last anchor sits exactly at 1.
  for (let i = 1; i < positions.length; i++) positions[i] = positions[i]! / positions[n]!;
  positions[n] = 1;

  const segmentOfPosition = (u: number): number => {
    let i = 0;
    while (i < n - 1 && u > positions[i + 1]!) i++;
    return i;
  };
  const segmentOfLog = (l: number): number => {
    let i = 0;
    while (i < n - 1 && l > logs[i + 1]!) i++;
    return i;
  };

  const timeAt = (u: number): number => {
    const v = Math.min(1, Math.max(0, u));
    const i = segmentOfPosition(v);
    if (v === positions[i]) return anchors[i]!;
    if (v === positions[i + 1]) return anchors[i + 1]!;
    const f = (v - positions[i]!) / (positions[i + 1]! - positions[i]!);
    return Math.pow(10, logs[i]! + f * (logs[i + 1]! - logs[i]!));
  };

  const positionOf = (t: number): number => {
    const l = Math.min(logs[n]!, Math.max(logs[0]!, Math.log10(t)));
    const i = segmentOfLog(l);
    const f = (l - logs[i]!) / (logs[i + 1]! - logs[i]!);
    return positions[i]! + f * (positions[i + 1]! - positions[i]!);
  };

  return { anchors: [...anchors], positions, timeAt, positionOf };
}
