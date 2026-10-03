// Turns the physical criteria of the epochs into cosmic times with the model.

import { JULIAN_YEAR, gevToKelvin, type Cosmology } from '../physics';
import type { Epoch, EpochId, Instant, Landmark } from './epochs';

export interface ResolvedLandmark {
  readonly id: string;
  readonly time: number;
  readonly source: Landmark;
}

export interface ResolvedEpoch {
  readonly id: EpochId;
  /** Anchor time [s]. */
  readonly anchor: number;
  /** Interval [s]. */
  readonly start: number;
  readonly end: number;
  readonly epoch: Epoch;
  readonly landmarks: readonly ResolvedLandmark[];
}

/** Cosmic time [s] of an instant according to the model. */
export function resolveInstant(cosmology: Cosmology, instant: Instant): number {
  switch (instant.kind) {
    case 'time':
      return instant.seconds;
    case 'temperature':
      return cosmology.timeAtTemperature(gevToKelvin(instant.gev));
    case 'redshift':
      return cosmology.timeAtRedshift(instant.z);
    case 'lookback':
      return cosmology.age - instant.years * JULIAN_YEAR;
    case 'today':
      return cosmology.age;
  }
}

export function resolveEpochs(
  cosmology: Cosmology,
  epochs: readonly Epoch[],
): readonly ResolvedEpoch[] {
  return epochs.map((epoch) => {
    const anchor = resolveInstant(cosmology, epoch.anchor);
    return {
      id: epoch.id,
      anchor,
      start: epoch.start ? resolveInstant(cosmology, epoch.start) : anchor,
      end: epoch.end ? resolveInstant(cosmology, epoch.end) : anchor,
      epoch,
      landmarks: (epoch.landmarks ?? []).map((landmark) => ({
        id: landmark.id,
        time: resolveInstant(cosmology, landmark.at),
        source: landmark,
      })),
    };
  });
}
