import { BufferGeometry, Uint32BufferAttribute } from 'three';

/**
 * Preserve the exact original visible halo samples. The source shader
 * deliberately sets gl_PointSize=0 for gl_VertexID % 8 !== 0; indexing only
 * the remaining vertices avoids submitting those seven invisible points.
 * gl_VertexID in WebGL2 indexed draws reads the source vertex index.
 *
 * Indexed rendering is now the default after laptop A/B validation.
 * Set ?haloMode=legacy to compare with the original full draw.
 */
export function indexedHaloGeometry(source: BufferGeometry): BufferGeometry {
  const count = source.getAttribute('position').count;
  if (count % 8 !== 0) throw new Error('Halo source count must be a multiple of eight');
  const indices = new Uint32Array(count / 8);
  for (let j = 0; j < indices.length; j++) indices[j] = j * 8;
  const geo = new BufferGeometry();
  geo.setAttribute('position', source.getAttribute('position'));
  geo.setAttribute('aLambda', source.getAttribute('aLambda'));
  geo.setIndex(new Uint32BufferAttribute(indices, 1));
  return geo;
}

export type GpuProbe = 'none' | 'halos' | 'matter' | 'bloom' | 'galaxies';

/** Query-only diagnostics do not affect ordinary visitors. */
export function gpuProbe(search: string): GpuProbe {
  const value = new URLSearchParams(search).get('gpuProbe');
  if (value === 'halos' || value === 'matter' || value === 'bloom' || value === 'galaxies') {
    return value;
  }
  return 'none';
}

export function haloMode(search: string): 'legacy' | 'indexed' {
  return new URLSearchParams(search).get('haloMode') === 'legacy' ? 'legacy' : 'indexed';
}
