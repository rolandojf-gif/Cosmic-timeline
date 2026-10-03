// Keyboard behaviour of the time control, kept free of the DOM so it can be tested.
//
// Follows the WAI-ARIA slider pattern: arrows move by a small step, Page Up and
// Page Down by a large one (here, to the next or previous stop), Home and End
// to the extremes.

/** Fine step: one thousandth of the control. */
export const FINE_STEP = 0.001;
/** Step with Shift held. */
export const COARSE_STEP = 0.01;

/** Positions closer than this count as the same stop. */
const SAME_STOP = 1e-9;

const clamp = (u: number): number => Math.min(1, Math.max(0, u));

/**
 * New control position after a key press, or null if the key does nothing.
 * `stops` are the control positions of the epoch anchors, in increasing order.
 */
export function positionAfterKey(
  key: string,
  shift: boolean,
  u: number,
  stops: readonly number[],
): number | null {
  const step = shift ? COARSE_STEP : FINE_STEP;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clamp(u + step);
    case 'ArrowLeft':
    case 'ArrowDown':
      return clamp(u - step);
    case 'PageUp':
      return stops.find((s) => s > u + SAME_STOP) ?? 1;
    case 'PageDown':
      return [...stops].reverse().find((s) => s < u - SAME_STOP) ?? 0;
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return null;
  }
}
