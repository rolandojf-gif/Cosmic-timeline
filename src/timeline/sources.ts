// Short citations shown in the interface. The full reference of every id is in
// docs/fuentes.md; tests check that each id has a heading there and that each
// link appears in it, so the two lists cannot drift apart.

export interface Source {
  /** Short citation, language-neutral. */
  readonly citation: string;
  /** DOI, arXiv or publisher link, as given in docs/fuentes.md. */
  readonly url: string;
}

export const SOURCES = {
  'planck2018-vi': {
    citation: 'Planck Collaboration 2020 (A&A 641, A6)',
    url: 'https://doi.org/10.1051/0004-6361/201833910',
  },
  fixsen2009: {
    citation: 'Fixsen 2009 (ApJ 707, 916)',
    url: 'https://doi.org/10.1088/0004-637X/707/2/916',
  },
  'saikawa-shirai-2020': {
    citation: 'Saikawa & Shirai 2020 (JCAP 08, 011)',
    url: 'https://doi.org/10.1088/1475-7516/2020/08/011',
  },
  'donofrio-rummukainen-2016': {
    citation: "D'Onofrio & Rummukainen 2016 (PRD 93, 025003)",
    url: 'https://doi.org/10.1103/PhysRevD.93.025003',
  },
  'hotqcd-2019': {
    citation: 'HotQCD, Bazavov et al. 2019 (PLB 795, 15)',
    url: 'https://doi.org/10.1016/j.physletb.2019.05.013',
  },
  'pdg-bbn-2025': {
    citation: 'Fields, Molaro & Sarkar, PDG 2025',
    url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-bbang-nucleosynthesis.pdf',
  },
  'planck2018-x': {
    citation: 'Planck Collaboration 2020 (A&A 641, A10)',
    url: 'https://doi.org/10.1051/0004-6361/201833887',
  },
  'bicep-keck-2021': {
    citation: 'BICEP/Keck 2021 (PRL 127, 151301)',
    url: 'https://doi.org/10.1103/PhysRevLett.127.151301',
  },
  bromm2013: {
    citation: 'Bromm 2013 (Rep. Prog. Phys. 76, 112901)',
    url: 'https://doi.org/10.1088/0034-4885/76/11/112901',
  },
  carniani2024: {
    citation: 'Carniani et al. 2024 (Nature 633, 318)',
    url: 'https://doi.org/10.1038/s41586-024-07860-9',
  },
  naidu2026: {
    citation: 'Naidu et al. 2026 (OJAp 9)',
    url: 'https://arxiv.org/abs/2505.11263',
  },
  bosman2022: {
    citation: 'Bosman et al. 2022 (MNRAS 514, 55)',
    url: 'https://doi.org/10.1093/mnras/stac1046',
  },
  'xiang-rix-2022': {
    citation: 'Xiang & Rix 2022 (Nature 603, 599)',
    url: 'https://doi.org/10.1038/s41586-022-04496-5',
  },
  connelly2012: {
    citation: 'Connelly et al. 2012 (Science 338, 651)',
    url: 'https://doi.org/10.1126/science.1226919',
  },
  dalrymple2001: {
    citation: 'Dalrymple 2001 (Geol. Soc. Spec. Publ. 190, 205)',
    url: 'https://doi.org/10.1144/GSL.SP.2001.190.01.14',
  },
  codata2018: {
    citation: 'CODATA 2018, Tiesinga et al. 2021 (RMP 93, 025010)',
    url: 'https://doi.org/10.1103/RevModPhys.93.025010',
  },
  'si-brochure-2019': {
    citation: 'BIPM, SI Brochure, 9th ed. 2019',
    url: 'https://www.bipm.org/en/publications/si-brochure',
  },
  'iau-2015-b3': {
    citation: 'IAU 2015 Resolution B3, Prša et al. 2016 (AJ 152, 41)',
    url: 'https://doi.org/10.3847/0004-6256/152/2/41',
  },
  'bahcall-2001': {
    citation: 'Bahcall, Pinsonneault & Basu 2001 (ApJ 555, 990)',
    url: 'https://doi.org/10.1086/321493',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Sources of the background model itself, cited next to the physical values. */
export const MODEL_SOURCES: readonly SourceId[] = ['planck2018-vi', 'fixsen2009', 'saikawa-shirai-2020'];

/** Sources of the reference values used in comparisons (physics/references.ts). */
export const COMPARISON_SOURCES: readonly SourceId[] = ['si-brochure-2019', 'iau-2015-b3', 'bahcall-2001'];
