// The stops of the time control.
//
// An epoch is an interval with an anchor: the instant the control stops at.
// Instants are given by the physical criterion that defines them, never by a
// date copied from a popular table. Temperatures and redshifts are turned into
// times by the cosmological model (resolve.ts); measured ages ("x years ago")
// are converted with the model's age of the universe.
//
// Every source id must exist in sources.ts and docs/fuentes.md (checked by the
// compiler and by tests).
// User-facing texts live in i18n, keyed by epoch id.

import {
  ELECTROWEAK_CROSSOVER_GEV,
  NEUTRON_FREEZE_OUT_GEV,
  PLANCK2018_DERIVED,
  PLANCK_TIME,
  QCD_CROSSOVER_GEV,
} from '../physics';
import type { SourceId } from './sources';

/** An instant, defined by how it is known. */
export type Instant =
  /** Cosmic time [s]. */
  | { readonly kind: 'time'; readonly seconds: number }
  /** Photon temperature [GeV]; the model gives the time. */
  | { readonly kind: 'temperature'; readonly gev: number }
  /** Redshift; the model gives the time. */
  | { readonly kind: 'redshift'; readonly z: number }
  /** Measured age before today [Julian years]; converted with the model's age. */
  | { readonly kind: 'lookback'; readonly years: number }
  /** Today (the model's age of the universe). */
  | { readonly kind: 'today' };

/**
 * How well the epoch is known.
 * - observed: measured directly (light elements, CMB, galaxies, radiometric ages).
 * - established-physics: laboratory-tested physics, no direct cosmological observation.
 * - model-dependent: follows from simulations or models not yet confirmed by observation.
 * - speculative: no confirmed theory or measurement.
 */
export type Evidence = 'observed' | 'established-physics' | 'model-dependent' | 'speculative';

export type EpochId =
  | 'planck'
  | 'inflation'
  | 'quarks'
  | 'hadrons'
  | 'nucleosynthesis'
  | 'recombination'
  | 'darkAges'
  | 'firstStars'
  | 'reionization'
  | 'milkyWay'
  | 'solarSystem'
  | 'earth'
  | 'today';

/** A dated object or event shown inside an epoch, not a stop of its own. */
export interface Landmark {
  readonly id: string;
  readonly at: Instant;
  readonly sources: readonly SourceId[];
  /** For a record ("most distant…"): the date it was last checked, ISO 8601. */
  readonly recordAsOf?: string;
}

export interface Epoch {
  readonly id: EpochId;
  /** The instant the control stops at. */
  readonly anchor: Instant;
  /**
   * True when the anchor is a representative choice inside a poorly bounded
   * interval rather than a defined event. The interface must say so.
   */
  readonly illustrativeAnchor: boolean;
  /** Interval covered by the epoch; omitted ends coincide with the anchor. */
  readonly start?: Instant;
  readonly end?: Instant;
  readonly evidence: Evidence;
  readonly sources: readonly SourceId[];
  readonly landmarks?: readonly Landmark[];
}

const MEGAYEAR = 1e6;

/** Ordered by anchor time (checked by tests). */
export const EPOCHS: readonly Epoch[] = [
  {
    id: 'planck',
    // The control starts at the Planck time; nothing earlier can be described.
    anchor: { kind: 'time', seconds: PLANCK_TIME },
    illustrativeAnchor: false,
    evidence: 'speculative',
    sources: ['codata2018'],
  },
  {
    id: 'inflation',
    // Model-dependent: the energy scale is only bounded from above (r < 0.036).
    // 1e-36 – 1e-32 s is the conventional illustrative range for GUT-scale inflation.
    anchor: { kind: 'time', seconds: 1e-36 },
    illustrativeAnchor: true,
    start: { kind: 'time', seconds: 1e-36 },
    end: { kind: 'time', seconds: 1e-32 },
    evidence: 'speculative',
    sources: ['bicep-keck-2021', 'planck2018-x'],
  },
  {
    id: 'quarks',
    // From the electroweak crossover to the QCD crossover.
    anchor: { kind: 'temperature', gev: ELECTROWEAK_CROSSOVER_GEV },
    illustrativeAnchor: false,
    end: { kind: 'temperature', gev: QCD_CROSSOVER_GEV },
    evidence: 'established-physics',
    sources: ['donofrio-rummukainen-2016', 'hotqcd-2019'],
  },
  {
    id: 'hadrons',
    // From the QCD crossover to neutron–proton freeze-out (T ≈ 1 MeV).
    anchor: { kind: 'temperature', gev: QCD_CROSSOVER_GEV },
    illustrativeAnchor: false,
    end: { kind: 'temperature', gev: NEUTRON_FREEZE_OUT_GEV },
    evidence: 'established-physics',
    sources: ['hotqcd-2019', 'pdg-bbn-2025'],
  },
  {
    id: 'nucleosynthesis',
    // Nuclei begin to form at T ≈ 0.1 MeV; abundances are fixed by t ~ 180 s.
    anchor: { kind: 'temperature', gev: 1e-4 },
    illustrativeAnchor: false,
    end: { kind: 'time', seconds: 180 },
    evidence: 'observed',
    sources: ['pdg-bbn-2025'],
  },
  {
    id: 'recombination',
    // Last-scattering surface.
    anchor: { kind: 'redshift', z: PLANCK2018_DERIVED.zStar.value },
    illustrativeAnchor: false,
    evidence: 'observed',
    sources: ['planck2018-vi'],
  },
  {
    id: 'darkAges',
    // From last scattering to the first stars; no direct observation yet.
    anchor: { kind: 'redshift', z: 100 },
    illustrativeAnchor: true,
    start: { kind: 'redshift', z: PLANCK2018_DERIVED.zStar.value },
    end: { kind: 'redshift', z: 30 },
    evidence: 'established-physics',
    sources: ['planck2018-vi', 'bromm2013'],
  },
  {
    id: 'firstStars',
    // Theory places the first stars at z ≈ 20–30.
    anchor: { kind: 'redshift', z: 25 },
    illustrativeAnchor: true,
    start: { kind: 'redshift', z: 30 },
    end: { kind: 'redshift', z: 20 },
    evidence: 'model-dependent',
    sources: ['bromm2013'],
    landmarks: [
      // Most distant spectroscopically confirmed galaxy.
      { id: 'momZ14', at: { kind: 'redshift', z: 14.44 }, sources: ['naidu2026'], recordAsOf: '2026-10-03' },
      { id: 'jadesGsZ14', at: { kind: 'redshift', z: 14.32 }, sources: ['carniani2024'] },
    ],
  },
  {
    id: 'reionization',
    // Anchor at the midpoint measured by Planck; complete by z ≈ 5.3.
    anchor: { kind: 'redshift', z: PLANCK2018_DERIVED.zReionization.value },
    illustrativeAnchor: false,
    end: { kind: 'redshift', z: 5.3 },
    evidence: 'observed',
    sources: ['planck2018-vi', 'bosman2022'],
  },
  {
    id: 'milkyWay',
    // The old (thick) disk starts forming ≈ 13 Gyr ago.
    anchor: { kind: 'lookback', years: 13e9 },
    illustrativeAnchor: false,
    evidence: 'observed',
    sources: ['xiang-rix-2022'],
  },
  {
    id: 'solarSystem',
    // Age of the oldest solids (CAIs): 4567.30 ± 0.16 Myr.
    anchor: { kind: 'lookback', years: 4567.3 * MEGAYEAR },
    illustrativeAnchor: false,
    evidence: 'observed',
    sources: ['connelly2012'],
  },
  {
    id: 'earth',
    // 4.54 ± 0.05 Gyr.
    anchor: { kind: 'lookback', years: 4540 * MEGAYEAR },
    illustrativeAnchor: false,
    evidence: 'observed',
    sources: ['dalrymple2001'],
  },
  {
    id: 'today',
    anchor: { kind: 'today' },
    illustrativeAnchor: false,
    evidence: 'observed',
    sources: ['planck2018-vi'],
  },
];
