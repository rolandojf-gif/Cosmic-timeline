// Which stop of the control a cosmic time belongs to.

import type { ResolvedEpoch } from './resolve';

/**
 * Index of the epoch whose control segment contains time t: the last epoch
 * whose anchor is at or before t. Epoch intervals overlap (the Milky Way starts
 * forming before reionization ends), so the segment, not the interval, decides
 * which text the panel shows. Times before the first anchor map to it.
 */
export function epochIndexAt(epochs: readonly ResolvedEpoch[], t: number): number {
  let index = 0;
  for (let i = 1; i < epochs.length; i++) {
    if (epochs[i]!.anchor <= t) index = i;
    else break;
  }
  return index;
}
