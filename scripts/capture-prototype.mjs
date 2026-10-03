// Captures of the scene prototype (prototype.html) with headless Chromium.
//
//   npx vite --port 5174 --strictPort &
//   node scripts/capture-prototype.mjs <outdir> [stops] [extra query]
//
// stops: comma-separated epoch ids, each optionally with @factor on t
// (recombination@0.9). Size from W and H (default 1920×1080). Uses the
// Playwright of the environment (PLAYWRIGHT_PATH, default the global install).
// In a container without a GPU it renders with SwiftShader: images are right,
// frame rates are not representative.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'captures';
const shots = (process.argv[3] ?? 'quarks,nucleosynthesis,recombination,firstStars,today').split(',');
const extra = process.argv[4] ?? '';
const port = process.env.PORT ?? '5174';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const shot of shots) {
  const [stop, f] = shot.split('@');
  const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1920), height: Number(process.env.H ?? 1080) } });
  page.on('console', (m) => console.log(stop, m.type(), m.text().slice(0, 400)));
  page.on('pageerror', (e) => console.log(stop, 'pageerror', e.message));
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/prototype.html?stop=${stop}${f ? '&f=' + f : ''}${extra}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
  await page.screenshot({ path: `${out}/${stop}${f ? '@' + f : ''}.png` });
  console.log(stop, 'done', Date.now() - t0, 'ms');
  await page.close();
}
await browser.close();
