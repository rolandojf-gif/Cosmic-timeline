// Asynchronous cosmic web loader using a Web Worker with zero-copy buffer transfer.
// Falls back to direct synchronous calculation in environments without Worker support.

import { createCosmicWeb, type CosmicWeb, type WebOptions, type WebSpectrum } from './cosmicWeb';
import type { CosmicWebWorkerRequest, CosmicWebWorkerResponse } from './cosmicWeb.worker';

/**
 * Generates the cosmic web asynchronously in a Web Worker, transferring the
 * resulting ArrayBuffers without copying memory.
 */
export function generateCosmicWeb(
  spectrum: WebSpectrum,
  options: WebOptions,
): Promise<CosmicWeb> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      try {
        resolve(createCosmicWeb(spectrum, options));
      } catch (err) {
        reject(err);
      }
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(new URL('./cosmicWeb.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      // Fallback if Worker instantiation fails
      try {
        resolve(createCosmicWeb(spectrum, options));
      } catch (err) {
        reject(err);
      }
      return;
    }

    worker.onmessage = (event: MessageEvent<CosmicWebWorkerResponse>) => {
      const data = event.data;
      worker.terminate();
      resolve(data);
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    const request: CosmicWebWorkerRequest = { spectrum, options };
    worker.postMessage(request);
  });
}
