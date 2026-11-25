// Web Worker for cosmic web generation. Pure: runs in a background thread
// so the UI and early plasma view remain responsive while 128³ is computed.

import { createCosmicWeb, type WebOptions, type WebSpectrum } from './cosmicWeb';

const PSI_SCALE = 0.25;
const LAMBDA_SCALE = 8;

export interface CosmicWebWorkerRequest {
  readonly spectrum: WebSpectrum;
  readonly options: WebOptions;
  /** When true, pre-quantise Int16 GPU attributes off the main thread and omit unused delta/eigenvalues. */
  readonly quantiseForScene?: boolean;
}

export interface CosmicWebWorkerResponse {
  readonly n: number;
  readonly boxMpcH: number;
  readonly displacement: Float32Array;
  readonly eigenvalues: Float32Array;
  readonly delta: Float32Array;
  readonly sigma: number;
  readonly peaks: readonly { readonly index: number; readonly delta: number }[];
  readonly psiInt16?: Int16Array;
  readonly lambdaInt16?: Int16Array;
}

self.addEventListener('message', (event: MessageEvent<CosmicWebWorkerRequest>) => {
  const { spectrum, options, quantiseForScene } = event.data;
  const web = createCosmicWeb(spectrum, options);

  if (quantiseForScene) {
    const len = 3 * web.n * web.n * web.n;
    const psiInt16 = new Int16Array(len);
    const lambdaInt16 = new Int16Array(len);
    const invPsi = 1 / PSI_SCALE;
    const invLambda = 1 / LAMBDA_SCALE;
    for (let i = 0; i < len; i++) {
      psiInt16[i] = Math.round(Math.max(-1, Math.min(1, web.displacement[i]! * invPsi)) * 32767);
      lambdaInt16[i] = Math.round(Math.max(-1, Math.min(1, web.eigenvalues[i]! * invLambda)) * 32767);
    }
    const empty = new Float32Array(0);
    const response: CosmicWebWorkerResponse = {
      n: web.n,
      boxMpcH: web.boxMpcH,
      displacement: web.displacement,
      eigenvalues: empty,
      delta: empty,
      sigma: web.sigma,
      peaks: web.peaks,
      psiInt16,
      lambdaInt16,
    };
    (self as unknown as Worker).postMessage(response, [
      web.displacement.buffer,
      psiInt16.buffer,
      lambdaInt16.buffer,
    ]);
    return;
  }

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
