// Readback hooks for validating render-path changes (?bench in the URL).
//
// A change that claims to leave the image intact is checked by rendering the
// same frozen frame with and without it and comparing every intermediate
// buffer exactly. Nothing here runs unless ?bench is present; without it the
// scene builds the same composer and draws the same passes as always.

import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

export function benchRequested(search: string): boolean {
  return new URLSearchParams(search).has('bench');
}

/** A float RGBA buffer read back from a render target (or the canvas). */
export interface BenchBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array | Uint8Array;
}

/**
 * Reads a HalfFloat/Float colour target as RGBA FLOAT. half → float is exact,
 * so equal floats mean equal stored halves.
 */
export function readFloatTarget(renderer: WebGLRenderer, target: WebGLRenderTarget): BenchBuffer {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const { width, height } = target;
  const data = new Float32Array(width * height * 4);
  renderer.setRenderTarget(target);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, data);
  return { width, height, data };
}

/** Reads the 8-bit canvas, as presented, right after the frame was drawn. */
export function readCanvas(renderer: WebGLRenderer): BenchBuffer {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  renderer.setRenderTarget(null);
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const data = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
  return { width, height, data };
}

/**
 * Composer pass that draws nothing: when armed, it copies the composer's
 * current read buffer (the image as the previous pass left it).
 */
export class ProbePass extends Pass {
  armed = false;
  captured: BenchBuffer | null = null;

  constructor() {
    super();
    this.needsSwap = false;
  }

  override render(renderer: WebGLRenderer, _writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    if (this.armed) this.captured = readFloatTarget(renderer, readBuffer);
  }
}

export interface SceneBench {
  /** Resolves once the cosmic web is built and the particle layers exist. */
  readonly ready: Promise<void>;
  /**
   * Renders one frozen frame at control position u (no drift, visual time 0,
   * paused) and returns every intermediate buffer by name.
   */
  capture(u: number): Record<string, BenchBuffer>;
  /** Turns the optimisation under test off/on (null: back to the URL default). */
  setOptimisation(on: boolean | null): void;
}
