// Web Worker for cosmic web generation. Pure: runs in a background thread
// so the UI and early plasma view remain responsive while 128³ is computed.

import { createCosmicWeb, type WebOptions, type WebSpectrum } from './cosmicWeb';

export interface CosmicWebWorkerRequest {
  readonly spectrum: WebSpectrum;
  readonly options: WebOptions;
}

export interface CosmicWebWorkerResponse {
  readonly n: number;
  readonly boxMpcH: number;
  readonly displacement: Float32Array;
  readonly eigenvalues: Float32Array;
  readonly delta: Float32Array;
  readonly sigma: number;
  readonly peaks: readonly { readonly index: number; readonly delta: number }[];
}

self.addEventListener('message', (event: MessageEvent<CosmicWebWorkerRequest>) => {
  const { spectrum, options } = event.data;
  const web = createCosmicWeb(spectrum, options);

  const response: CosmicWebWorkerResponse = {
    n: web.n,
    boxMpcH: web.boxMpcH,
    displacement: web.displacement,
    eigenvalues: web.eigenvalues,
    delta: web.delta,
    sigma: web.sigma,
    peaks: web.peaks,
  };

  // Transfer the large ArrayBuffers to avoid copying memory across threads.
  (self as unknown as Worker).postMessage(response, [
    web.displacement.buffer,
    web.eigenvalues.buffer,
    web.delta.buffer,
  ]);
});
