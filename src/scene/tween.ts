// A step between two control positions that eases in and out, and that can be
// retargeted mid-way without a jump in position or speed (dragging the control
// retargets it every frame). Pure: time is passed in, nothing is scheduled.

export interface Tween {
  /** Position at time `now` [s]. */
  valueAt(now: number): number;
  /** Speed [units/s] at time `now`. */
  speedAt(now: number): number;
  /** True once the step has arrived. */
  doneAt(now: number): boolean;
  /** Start a new step towards `target` from wherever the current one is. */
  retarget(target: number, now: number): void;
  /** Jump to `value` at once (reduced motion, first frame). */
  jump(value: number): void;
  readonly target: number;
}

/**
 * Cubic Hermite from (p0, v0) to (p1, 0) over `duration`. With v0 = 0 it is the
 * smoothstep ease-in-out 3τ² − 2τ³.
 */
export function createTween(initial: number, duration: number): Tween {
  let p0 = initial;
  let v0 = 0;
  let p1 = initial;
  let start = -Infinity;

  const phase = (now: number): number => Math.min(1, Math.max(0, (now - start) / duration));

  const valueAt = (now: number): number => {
    const s = phase(now);
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * duration * v0 + (-2 * s3 + 3 * s2) * p1;
  };

  const speedAt = (now: number): number => {
    const s = phase(now);
    if (s >= 1) return 0;
    const s2 = s * s;
    return ((6 * s2 - 6 * s) * p0 + (3 * s2 - 4 * s + 1) * duration * v0 + (-6 * s2 + 6 * s) * p1) / duration;
  };

  return {
    valueAt,
    speedAt,
    doneAt: (now) => phase(now) >= 1,
    retarget(target, now) {
      if (target === p1) return;
      const value = valueAt(now);
      const speed = speedAt(now);
      p0 = value;
      v0 = speed;
      p1 = target;
      start = now;
    },
    jump(value) {
      p0 = value;
      p1 = value;
      v0 = 0;
      start = -Infinity;
    },
    get target() {
      return p1;
    },
  };
}
