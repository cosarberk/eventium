/**
 * Headless screenshot of the running Eventium app, so the studio UI can be
 * reviewed visually. Logs in as the screenshot bot, opens a board in edit mode,
 * and writes a PNG.
 *
 * Usage: node scripts/shot.mjs [route] [outPath]
 *   route   default '/boards'
 *   outPath default '/home/berk/Screenshots/eventium-auto.png'
 */
import { chromium } from 'playwright-core';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173';
const EMAIL = process.env.SHOT_EMAIL ?? 'shot@eventium.local';
const PASSWORD = process.env.SHOT_PASSWORD ?? 'ShotBot!2026';
const route = process.argv[2] ?? '/boards';
const out = process.argv[3] ?? '/home/berk/Screenshots/eventium-auto.png';
const EDIT = process.env.SHOT_EDIT !== '0';

const log = (...a) => console.log('[shot]', ...a);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
try {
  const ctx = await browser.newContext({
    viewport: { width: 1680, height: 945 },
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') log('page-error:', m.text().slice(0, 200));
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

  // Log in if the login form is present.
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.count()) {
    await emailInput.fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /giriş|sign in|login|gir/i }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(800);
  }

  // Optionally open a specific project by name from the start-screen grid.
  // Project cards are role="button" divs (they nest action buttons), so match
  // both real buttons and role=button elements.
  const project = process.env.SHOT_PROJECT;
  if (project) {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page
      .locator('button, [role="button"]', { hasText: project })
      .first()
      .click()
      .catch(() => log('project not found:', project));
    await page.waitForTimeout(800);
  } else {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1000);

  // Enter edit mode so the docking studio shows.
  if (EDIT) {
    const edit = page.getByRole('button', { name: /^düzenle$/i }).first();
    if (await edit.count()) {
      await edit.click();
      await page.waitForTimeout(1500);
    }
  }

  // Optionally add a component by palette label (e.g. SHOT_ADD="Stat").
  if (process.env.SHOT_ADD) {
    await page
      .locator('aside button', { hasText: process.env.SHOT_ADD })
      .first()
      .click()
      .catch(() => log('palette item not found:', process.env.SHOT_ADD));
    await page.waitForTimeout(1400);
  }

  await page.screenshot({ path: out, fullPage: false });
  log('saved', out, '(url:', page.url(), ')');
} finally {
  await browser.close();
}
