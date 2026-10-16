// GPU time of each frame, for the ?fps overlay, measured with
// EXT_disjoint_timer_query_webgl2 when the browser exposes it. Queries are
// read back asynchronously (a frame or more later), so nothing ever waits on
// the GPU. Frames whose measurement was disjoint are dropped.

export interface GpuFrameTimer {
  /** True when the browser exposes the timer extension. */
  readonly available: boolean;
  begin(): void;
  end(): void;
  /** Mean GPU ms of the frames resolved since the last call (NaN if none). */
  takeMean(): number;
}

interface TimerQueryExt {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
}

export function createGpuFrameTimer(gl: WebGL2RenderingContext): GpuFrameTimer {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExt | null;
  const pending: WebGLQuery[] = [];
  let active: WebGLQuery | null = null;
  let sum = 0;
  let count = 0;

  const poll = (): void => {
    if (!ext) return;
    while (pending.length > 0) {
      const query = pending[0]!;
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
      const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
      if (!disjoint) {
        sum += ns / 1e6;
        count++;
      }
      gl.deleteQuery(query);
      pending.shift();
    }
  };

  return {
    available: ext !== null,
    begin() {
      if (!ext || active || pending.length > 4) return;
      poll();
      active = gl.createQuery();
      if (active) gl.beginQuery(ext.TIME_ELAPSED_EXT, active);
    },
    end() {
      if (!ext || !active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(active);
      active = null;
    },
    takeMean() {
      poll();
      const mean = count > 0 ? sum / count : NaN;
      sum = 0;
      count = 0;
      return mean;
    },
  };
}
