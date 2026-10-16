/**
 * Opt-in GPU diagnostics. The normal scene is never touched.
 *
 * GPU timers report elapsed GPU execution time for the composited frame
 * when EXT_disjoint_timer_query_webgl2 is exposed. Results are asynchronous,
 * never force a GPU sync, and are not machine-wide GPU utilisation.
 */
export type ScenePass = 'none' | 'plasma' | 'matter' | 'halos' | 'galaxies' | 'bloom';

export interface SceneDiagnosticOptions {
  readonly enabled: boolean;
  readonly skip: ScenePass;
}

export function parseSceneDiagnostics(search: string): SceneDiagnosticOptions {
  const params = new URLSearchParams(search);
  const enabled = params.get('gpuDiag') === '1';
  const value = enabled ? params.get('gpuSkip') : null;
  const skip: ScenePass =
    value === 'plasma' || value === 'matter' || value === 'halos' ||
    value === 'galaxies' || value === 'bloom' ? value : 'none';
  return { enabled, skip };
}

type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

/** Maximum of four unresolved GPU queries; never stall waiting for a result. */
export class GpuFrameTimer {
  private readonly ext: TimerExtension | null;
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;
  readonly available: boolean;
  lastMs: number | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
    this.available = this.ext !== null;
  }

  start(): void {
    if (!this.ext || this.active || this.pending.length >= 4) return;
    const query = this.gl.createQuery();
    if (!query) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = query;
  }

  end(): void {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  poll(): void {
    if (!this.ext || this.pending.length === 0) return;
    if (this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
      for (const query of this.pending) this.gl.deleteQuery(query);
      this.pending.length = 0;
      this.lastMs = null;
      return;
    }
    // Oldest result first, never wait synchronously for the GPU.
    while (this.pending.length) {
      const query = this.pending[0]!;
      if (!this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) return;
      const nanoseconds = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT) as number;
      this.lastMs = Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000 : null;
      this.gl.deleteQuery(query);
      this.pending.shift();
    }
  }

  dispose(): void {
    if (this.active && this.ext) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active);
      this.active = null;
    }
    for (const query of this.pending) this.gl.deleteQuery(query);
    this.pending.length = 0;
  }
}
