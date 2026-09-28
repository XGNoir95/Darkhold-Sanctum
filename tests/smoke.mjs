import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(20000);
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(process.env.CG_TEST_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#interface:not(.is-hidden)');
await page.waitForTimeout(2200);
await page.screenshot({ path: 'tests/room.png' });
console.log('room captured');
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(1260, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tests/room-rotated.png' });
console.log('rotated room captured');
await page.locator('[data-view="room"]').evaluate((element) => element.click());
await page.waitForTimeout(500);
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(720, 820, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({ path: 'tests/room-look-up.png' });
await page.locator('[data-view="room"]').evaluate((element) => element.click());
await page.waitForTimeout(500);
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(720, 90, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({ path: 'tests/room-look-down.png' });
console.log('vertical orbit captured');
await page.locator('[data-view="desk"]').evaluate((element) => element.click());
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tests/desk.png' });
console.log('desk captured');
await page.locator('[data-view="book"]').evaluate((element) => element.click());
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tests/book-closed.png' });
await page.locator('#book-prompt').evaluate((element) => element.click());
await page.waitForTimeout(1700);
await page.screenshot({ path: 'tests/book-open.png' });
await page.mouse.click(720, 450);
await page.waitForTimeout(350);
await page.screenshot({ path: 'tests/book-turning.png' });
await page.waitForTimeout(850);
await page.screenshot({ path: 'tests/book-after-turn.png' });
for (let turn = 0; turn < 4; turn += 1) {
  await page.mouse.click(720, 450);
  await page.waitForTimeout(900);
  if (turn === 1) await page.screenshot({ path: 'tests/book-lind-page.png' });
}
await page.screenshot({ path: 'tests/book-notebook-page.png' });
await page.mouse.click(890, 450);
await page.waitForTimeout(300);
await page.mouse.click(720, 450);
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/book-written-page.png' });
await page.mouse.click(720, 450);
await page.waitForTimeout(1800);
await page.screenshot({ path: 'tests/book-auto-closed.png' });
console.log('book captured');
const result = await page.evaluate(() => ({
  title: document.title,
  canvas: [document.querySelector('#scene').width, document.querySelector('#scene').height],
  chapter: document.querySelector('#chapter-title').textContent,
  prompt: document.querySelector('#book-prompt strong').textContent,
}));
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
if (result.prompt !== 'Open the Death Note') {
  console.error(`Expected the book to close after the fifth general page, got: ${result.prompt}`);
  process.exit(1);
}
