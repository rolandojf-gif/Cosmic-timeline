// Captures of the production scene with headless Chromium.
//
//   npx vite --port 5174 --strictPort &
//   node scripts/capture-scene.mjs <outdir> [stops]
//
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'captures';
const shots = (process.argv[3] ?? 'quarks,nucleosynthesis,recombination,firstStars,today').split(',');
const port = process.env.PORT ?? '5174';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const stop of shots) {
  const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1920), height: Number(process.env.H ?? 1080) } });
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/?lang=en`);
  await page.waitForSelector('body.has-scene', { timeout: 30000 });
  const btn = page.locator(`button:has-text("${stop}")`).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: `${out}/${stop}.png` });
  console.log(stop, 'done', Date.now() - t0, 'ms');
  await page.close();
}
await browser.close();
