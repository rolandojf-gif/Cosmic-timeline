import { BufferGeometry, Uint32BufferAttribute } from 'three';

/**
 * Original halo shader only draws vertices with gl_VertexID % 8 === 0.
 * Draw exactly those same indexed vertices (WebGL2 glDrawElements retains
 * the source gl_VertexID) instead of dispatching seven invisible vertices
 * for each visible halo. Positions and eigenvalues remain shared with the
 * full-density, unmodified matter cloud.
 */
export function buildSparseHaloGeometry(matter: BufferGeometry): BufferGeometry {
  const count = matter.getAttribute('position').count;
  if (count % 8 !== 0) throw new Error('Matter particle count must be divisible by eight');
  const indices = new Uint32Array(count / 8);
  for (let i = 0; i < indices.length; i++) indices[i] = i * 8;

  const halo = new BufferGeometry();
  halo.setAttribute('position', matter.getAttribute('position'));
  halo.setAttribute('aLambda', matter.getAttribute('aLambda'));
  halo.setIndex(new Uint32BufferAttribute(indices, 1));
  return halo;
}

/** Bounded presentation resolution; physical cosmic field stays 128³. */
export function scenePixelRatio(devicePixelRatio: number, mobile: boolean, search: string): number {
  const raw = new URLSearchParams(search).get('dprcap');
  const requested = raw === null ? null : Number(raw);
  const allowed = [1, 1.25, 1.5, 2];
  const cap = requested !== null && allowed.includes(requested)
    ? requested
    : (mobile ? 1.5 : 1.25);
  return Math.min(Math.max(1, devicePixelRatio || 1), cap);
}
