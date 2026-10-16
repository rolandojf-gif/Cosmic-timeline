// Render-path optimisations that must leave the image bit-identical in RGB.
// Each one is on by default and can be turned off from the URL (?o2=0, …) so
// the same build can be compared with and without it on real hardware.
//
//   o1  skip particle layers whose brightness uniform is exactly 0
//   o2  clip away matter/halo points whose brightness is exactly 0
//   o3  draw the halo pass from an index of its 1-in-8 particles
//   o4  discard matter/halo fragments whose colour is exactly 0

export const OPTIMISATIONS = ['o1', 'o2', 'o3', 'o4'] as const;
export type OptimisationId = (typeof OPTIMISATIONS)[number];
export type OptimisationFlags = Record<OptimisationId, boolean>;

export function optimisationsFromUrl(search: string): OptimisationFlags {
  const params = new URLSearchParams(search);
  const flags = {} as Record<OptimisationId, boolean>;
  for (const id of OPTIMISATIONS) flags[id] = params.get(id) !== '0';
  return flags;
}
