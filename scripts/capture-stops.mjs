// Final-image captures of the canvas at every stop, in the normal page (no
// ?bench), for comparing two builds pixel by pixel. Reduced motion is
// emulated so each stop is a still frame at visual time 0, exactly what a
// paused visitor sees on arrival; all UI except the canvas is hidden.
//
//   npx vite preview --port 5174 --strictPort &
//   node scripts/capture-stops.mjs <outdir> [extra query]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'stops';
const extra = process.argv[3] ?? '';
const port = process.env.PORT ?? '5174';
const settleMs = Number(process.env.SETTLE_MS ?? 15000);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto(`http://localhost:${port}/?lang=en${extra ? `&${extra}` : ''}`);
await page.waitForSelector('body.has-scene', { timeout: 60000 });
await page.waitForTimeout(settleMs);
const count = await page.locator('.stop-button').count();
const names = [];
for (let i = 0; i < count; i++) {
  await page.locator('.stop-button').nth(i).click();
  await page.waitForTimeout(settleMs);
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } canvas { visibility: visible !important; }' });
  const png = await page.screenshot();
  const name = String(i).padStart(2, '0');
  writeFileSync(`${out}/${name}.png`, png);
  names.push(name);
  await page.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent?.includes('visibility: hidden !important') && s.remove()));
  console.log(name, 'done');
}
await browser.close();
