// Exact A/B readback of the scene's buffers, for render-path changes that must
// leave the image untouched. Needs a build or dev server with the ?bench hooks.
//
//   npx vite build && npx vite preview --port 5174 --strictPort &
//   node scripts/bench-readback.mjs <out.json> [desktop|mobile] [extra query]
//
// For every control position (the thirteen stops, a uniform grid and both sides
// of each layer's visibility threshold) it renders one frozen frame and reports,
// per buffer, SHA-256 of the RGB and of the alpha channels separately. When the
// build exposes a runtime toggle for a change (bench.scene.setOptimisation), it
// also renders the frame without and with it in the same page and counts every
// pixel whose RGB or alpha differs, with the largest difference. A repeat of
// the "without" frame checks that the renderer itself is deterministic.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');
const out = process.argv[2] ?? 'bench-readback.json';
const profile = process.argv[3] ?? 'desktop';
const extra = process.argv[4] ?? '';
const port = process.env.PORT ?? '5174';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context =
  profile === 'mobile'
    ? await browser.newContext({ ...devices['Pixel 7'] })
    : await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.error('page:', m.text());
});
await page.goto(`http://localhost:${port}/?lang=en&bench${extra ? `&${extra}` : ''}`);
await page.waitForFunction(() => '__cosmicBench' in window, null, { timeout: 60000 });
await page.evaluate(() => window.__cosmicBench.scene.ready);

// Positions: stops, a grid, and the last/first position on each side of every
// change in gasLevel === 0 or galaxiesVisible === 0.
const positions = await page.evaluate(() => {
  const { stops, stateAt } = window.__cosmicBench;
  const list = stops.map((s) => ({ label: s.id, u: s.u }));
  for (let i = 0; i <= 40; i++) list.push({ label: `grid${i}`, u: i / 40 });
  const flags = (u) => {
    const s = stateAt(u);
    return `${s.gasLevel === 0}|${s.galaxiesVisible === 0}`;
  };
  const N = 4000;
  for (let i = 0; i < N; i++) {
    let a = i / N;
    let b = (i + 1) / N;
    if (flags(a) === flags(b)) continue;
    for (let k = 0; k < 60; k++) {
      const m = (a + b) / 2;
      if (m === a || m === b) break;
      if (flags(m) === flags(a)) a = m;
      else b = m;
    }
    list.push({ label: `edge${i}-before`, u: a }, { label: `edge${i}-after`, u: b });
  }
  return list.map((p) => {
    const s = stateAt(p.u);
    return { ...p, gasLevel: s.gasLevel, galaxiesVisible: s.galaxiesVisible, haze: s.haze };
  });
});

const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const results = [];
for (const pos of positions.filter((p) => !only || only.has(p.label))) {
  const t0 = Date.now();
  const r = await page.evaluate(async (u) => {
    const bench = window.__cosmicBench.scene;
    const hex = async (bytes) =>
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    const split = (data) => {
      const n = data.length / 4;
      const rgb = new data.constructor(3 * n);
      const alpha = new data.constructor(n);
      for (let p = 0; p < n; p++) {
        rgb[3 * p] = data[4 * p];
        rgb[3 * p + 1] = data[4 * p + 1];
        rgb[3 * p + 2] = data[4 * p + 2];
        alpha[p] = data[4 * p + 3];
      }
      return { rgb, alpha };
    };
    const summarise = async (buffers) => {
      const s = {};
      for (const [name, b] of Object.entries(buffers)) {
        const { rgb, alpha } = split(b.data);
        let aMin = Infinity;
        let aMax = -Infinity;
        let nonFinite = 0;
        for (let i = 0; i < b.data.length; i++) if (!Number.isFinite(b.data[i])) nonFinite++;
        for (let p = 0; p < alpha.length; p++) {
          aMin = Math.min(aMin, alpha[p]);
          aMax = Math.max(aMax, alpha[p]);
        }
        s[name] = {
          size: `${b.width}x${b.height}`,
          rgbSha: await hex(rgb.buffer),
          alphaSha: await hex(alpha.buffer),
          alphaMin: aMin,
          alphaMax: aMax,
          nonFinite,
        };
      }
      return s;
    };
    // Bitwise per-pixel comparison of two captures of the same buffers.
    const compare = (A, B) => {
      const c = {};
      for (const name of Object.keys(A)) {
        const a = A[name].data;
        const b = B[name].data;
        const bitsA = a instanceof Float32Array ? new Uint32Array(a.buffer) : a;
        const bitsB = b instanceof Float32Array ? new Uint32Array(b.buffer) : b;
        let rgbPixels = 0;
        let alphaPixels = 0;
        let rgbMax = 0;
        let alphaMax = 0;
        for (let p = 0; p < a.length / 4; p++) {
          let rgbDiff = false;
          for (let k = 0; k < 3; k++) {
            const i = 4 * p + k;
            if (bitsA[i] !== bitsB[i]) {
              rgbDiff = true;
              const d = Math.abs(a[i] - b[i]);
              rgbMax = Math.max(rgbMax, Number.isNaN(d) ? Infinity : d);
            }
          }
          if (rgbDiff) rgbPixels++;
          const i = 4 * p + 3;
          if (bitsA[i] !== bitsB[i]) {
            alphaPixels++;
            const d = Math.abs(a[i] - b[i]);
            alphaMax = Math.max(alphaMax, Number.isNaN(d) ? Infinity : d);
          }
        }
        c[name] = { rgbPixels, rgbMax, alphaPixels, alphaMax };
      }
      return c;
    };

    if (typeof bench.setOptimisation !== 'function') {
      const t = performance.now();
      const one = bench.capture(u);
      return { captureMs: performance.now() - t, only: await summarise(one) };
    }
    bench.setOptimisation(false);
    const off = bench.capture(u);
    const offAgain = bench.capture(u);
    bench.setOptimisation(true);
    const on = bench.capture(u);
    bench.setOptimisation(null);
    return {
      off: await summarise(off),
      on: await summarise(on),
      repeat: compare(off, offAgain),
      diff: compare(off, on),
    };
  }, pos.u);
  results.push({ ...pos, ...r });
  console.log(pos.label, pos.u.toFixed(6), `${Date.now() - t0} ms`);
}

const meta = await page.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    devicePixelRatio,
    innerWidth,
    innerHeight,
    drawingBuffer: `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`,
    url: location.href,
  };
});
writeFileSync(out, JSON.stringify({ profile, meta, results }, null, 1));
await browser.close();
