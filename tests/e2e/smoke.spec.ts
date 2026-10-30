import { readFileSync } from 'node:fs';
import { type ElectronApplication, _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

async function launch(...args: string[]): Promise<ElectronApplication> {
  return electron.launch({ args: ['.', ...args], env: { ...process.env, SPLITWATCH_NO_UPDATES: '1' } });
}

test('opens the window with translated text, a CSP and no Node in the page', async () => {
  const app = await launch();
  const errors: string[] = [];
  const page = await app.firstWindow();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.welcome.title);
  await expect(page.getByText(`Version ${version}`)).toBeVisible();
  expect(await page.title()).toBe('Splitwatch');
  expect(await page.evaluate(() => location.origin)).toBe('app://splitwatch');
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');
  // No Node.js in the page: only the preload's bridge.
  const globals = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    return [typeof w.require, typeof w.process, typeof w.splitwatch];
  });
  expect(globals).toEqual(['undefined', 'undefined', 'object']);

  const csp = await page.evaluate(async () => (await fetch(location.href)).headers.get('content-security-policy'));
  expect(csp).toContain("default-src 'self'");

  expect(errors).toEqual([]);
  await app.close();
});

test('the right-to-left pseudo-locale mirrors the layout', async () => {
  const app = await launch('--locale=ar-XB');
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir])).toEqual([
    'ar-XB',
    'rtl',
  ]);
  // The card's accent border sits on the inline start, which is the right edge in RTL.
  const border = await page.locator('.welcome-card').evaluate((el) => getComputedStyle(el).borderRightWidth);
  expect(border).toBe('4px');
  await app.close();
});

test('the long pseudo-locale still fits the window', async () => {
  const app = await launch('--locale=en-XA');
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('[');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await app.close();
});
