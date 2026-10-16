// Render-path optimisations that must leave the image bit-identical in RGB.
// Each one is on by default and can be turned off from the URL (?o2=0, …) so
// the same build can be compared with and without it on real hardware.
//
//   o1  skip particle layers whose brightness uniform is exactly 0
//   o2  clip away matter/halo points whose brightness is exactly 0
//   o4  discard matter/halo fragments whose colour is exactly 0
//
// o3 (drawing the halo pass from an index of its 1-in-8 particles) was tried
// and dropped: the other 7 in 8 get gl_PointSize 0, which the spec leaves
// undefined, and SwiftShader rasterises them as bright 1-pixel points that are
// part of the approved image, so skipping them changed it.

export const OPTIMISATIONS = ['o1', 'o2', 'o4'] as const;
export type OptimisationId = (typeof OPTIMISATIONS)[number];
export type OptimisationFlags = Record<OptimisationId, boolean>;

export function optimisationsFromUrl(search: string): OptimisationFlags {
  const params = new URLSearchParams(search);
  const flags = {} as Record<OptimisationId, boolean>;
  for (const id of OPTIMISATIONS) flags[id] = params.get(id) !== '0';
  return flags;
}
