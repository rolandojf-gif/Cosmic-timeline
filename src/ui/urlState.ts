// Pure URL state helpers for deep-linking to any cosmic epoch or instant.
// No DOM dependencies so it can be unit-tested in Node.

import type { Locale } from '../i18n';
import type { ResolvedEpoch, TimeScale } from '../timeline';

/** Anchor time [s] for the Reheating / Hot Big Bang milestone inside inflation. */
export const REHEATING_TIME_S = 1e-32;

/** Control-space tolerance within which a position snaps to a named epoch in share URLs. */
const EPOCH_MATCH_TOLERANCE = 0.002;

export interface InitialUrlPosition {
  readonly u: number;
  readonly explicit: boolean;
}

/**
 * Resolves `?epoch=<id>` (including `reheating`) or `?t=<seconds>` from the
 * URL query string into a control position u ∈ [0, 1].
 */
export function initialPositionFromUrl(
  search: string,
  epochs: readonly ResolvedEpoch[],
  scale: TimeScale,
): InitialUrlPosition {
  const params = new URLSearchParams(search);
  const epochParam = params.get('epoch')?.trim().toLowerCase();
  if (epochParam) {
    if (epochParam === 'reheating') {
      return { u: scale.positionOf(REHEATING_TIME_S), explicit: true };
    }
    const idx = epochs.findIndex((e) => e.epoch.id.toLowerCase() === epochParam);
    if (idx !== -1) {
      return { u: scale.positions[idx]!, explicit: true };
    }
  }

  const timeParam = params.get('t')?.trim();
  if (timeParam) {
    const parsed = Number(timeParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      return { u: scale.positionOf(parsed), explicit: true };
    }
  }

  return { u: 0, explicit: false };
}

/**
 * Builds a clean shareable URL pointing to the current instant, using
 * `?epoch=<id>` when sitting on an epoch/reheating anchor and `?t=<seconds>`
 * otherwise. Preserves `lang` when non-default or already specified.
 */
export function buildShareUrl(
  href: string,
  u: number,
  epochs: readonly ResolvedEpoch[],
  scale: TimeScale,
  locale: Locale,
): string {
  const url = new URL(href);
  url.searchParams.delete('epoch');
  url.searchParams.delete('t');

  if (locale === 'es' || url.searchParams.has('lang')) {
    url.searchParams.set('lang', locale);
  }

  const reheatingU = scale.positionOf(REHEATING_TIME_S);
  let matchedEpoch: string | null = null;
  let bestDist = EPOCH_MATCH_TOLERANCE;

  for (let i = 0; i < epochs.length; i++) {
    const dist = Math.abs(u - scale.positions[i]!);
    if (dist <= bestDist) {
      bestDist = dist;
      matchedEpoch = epochs[i]!.epoch.id;
    }
  }
  if (Math.abs(u - reheatingU) <= bestDist) {
    matchedEpoch = 'reheating';
  }

  if (matchedEpoch !== null) {
    url.searchParams.set('epoch', matchedEpoch);
  } else {
    const t = scale.timeAt(u);
    const formatted = t >= 1e-3 && t < 1e6 ? Number(t.toPrecision(4)).toString() : t.toExponential(3);
    url.searchParams.set('t', formatted);
  }

  return url.toString();
}
