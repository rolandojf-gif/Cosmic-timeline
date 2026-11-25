// Asynchronous cosmic web loader using a Web Worker with zero-copy buffer transfer.
// Falls back to direct synchronous calculation in environments without Worker support.

import { createCosmicWeb, type CosmicWeb, type WebOptions, type WebSpectrum } from './cosmicWeb';
import type { CosmicWebWorkerRequest, CosmicWebWorkerResponse } from './cosmicWeb.worker';

export interface GenerateCosmicWebConfig {
  readonly quantiseForScene?: boolean;
  readonly signal?: AbortSignal;
}

/**
 * Generates the cosmic web asynchronously in a Web Worker, transferring the
 * resulting ArrayBuffers without copying memory.
 */
export function generateCosmicWeb(
  spectrum: WebSpectrum,
  options: WebOptions,
  config?: GenerateCosmicWebConfig,
): Promise<CosmicWeb> {
  return new Promise((resolve, reject) => {
    if (config?.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

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

    const onAbort = (): void => {
      worker.terminate();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    config?.signal?.addEventListener('abort', onAbort, { once: true });

    worker.onmessage = (event: MessageEvent<CosmicWebWorkerResponse>) => {
      config?.signal?.removeEventListener('abort', onAbort);
      const data = event.data;
      worker.terminate();
      resolve(data);
    };

    worker.onerror = (err) => {
      config?.signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      reject(err);
    };

    const request: CosmicWebWorkerRequest =
      config?.quantiseForScene !== undefined
        ? { spectrum, options, quantiseForScene: config.quantiseForScene }
        : { spectrum, options };
    worker.postMessage(request);
  });
}
