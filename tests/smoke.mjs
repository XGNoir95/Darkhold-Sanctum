import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(90000);
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(root, 'tests', 'doors.png') });
await page.mouse.click(720, 450);
await page.waitForTimeout(9000);
await page.screenshot({ path: path.join(root, 'tests', 'temple.png') });

const initial = await page.evaluate(() => ({
  mode: window.__sanctum?.state.mode,
  objects: window.__sanctum?.scene.children.length,
  perspective: window.__sanctum?.camera.isPerspectiveCamera,
  doors: window.__sanctum?.temple.doorProgress,
}));

await page.keyboard.down('d');
await page.waitForTimeout(450);
await page.keyboard.up('d');
await page.keyboard.press('c');
await page.mouse.click(720, 415);
await page.waitForTimeout(1800);
await page.mouse.click(880, 430);
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(root, 'tests', 'book-open.png') });

const final = await page.evaluate(() => ({
  mode: window.__sanctum.state.mode,
  angle: window.__sanctum.state.cameraAngle,
  coverChanges: window.__sanctum.state.coverChanges,
  bookOpen: window.__sanctum.darkhold.isOpen,
  turnedPages: window.__sanctum.darkhold.turnedPages,
  interactions: window.__sanctum.darkhold.interactionCount,
}));

console.log(JSON.stringify({ initial, final, errors }, null, 2));
await browser.close();
if (errors.length || initial.mode !== 'exploring' || initial.doors < .99 || !final.bookOpen || final.turnedPages < 1) process.exitCode = 1;
