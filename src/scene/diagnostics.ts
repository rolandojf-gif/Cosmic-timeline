// ?diag=…: diagnostic switches that remove one part of the scene to find out
// what costs GPU time on a given machine. They change the image on purpose and
// are never on unless the URL asks for them. Several can be combined:
// ?diag=nohalo,nobloom.
//
//   nohalo      skip the halo pass
//   nomatter    skip the matter and halo passes
//   nogalaxies  skip the galaxy pass
//   nobloom     skip the bloom pass

export const DIAGNOSTICS = ['nohalo', 'nomatter', 'nogalaxies', 'nobloom'] as const;
export type Diagnostic = (typeof DIAGNOSTICS)[number];

export function diagnosticsFromUrl(search: string): ReadonlySet<Diagnostic> {
  const raw = new URLSearchParams(search).get('diag') ?? '';
  const names = raw.split(',').map((s) => s.trim());
  return new Set(DIAGNOSTICS.filter((d) => names.includes(d)));
}
