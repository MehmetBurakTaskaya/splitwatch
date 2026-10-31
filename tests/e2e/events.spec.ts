import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));

// A stand-in for Wikipedia's API: the medal table of the 2026 Winter Games' page.
const WIKITEXT = `{{Medals table
 | host_ITA = yes
 | gold_NOR = 18| silver_NOR = 12| bronze_NOR = 11
 | gold_ITA = 10| silver_ITA = 6 | bronze_ITA = 14
}}`;

async function startWikipedia(): Promise<{ base: string; pages: string[]; close(): Promise<void> }> {
  const pages: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    pages.push(url.searchParams.get('pageid') ?? '');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ parse: { wikitext: WIKITEXT } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    pages,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

test('an event mode: its theme, schedule and medal table, and the opening animation of another', async () => {
  const wikipedia = await startWikipedia();
  const userData = mkdtempSync(path.join(tmpdir(), 'splitwatch-events-'));
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      clipboardSuggestions: false,
      language: 'en',
      event: { active: 'winter-2026', introSeen: ['winter-2026'], country: 'NO' },
    }),
  );
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      SPLITWATCH_NO_UPDATES: '1',
      SPLITWATCH_NO_REMOTE_PRESETS: '1',
      SPLITWATCH_USER_DATA: userData,
      SPLITWATCH_WIKIPEDIA_BASE: wikipedia.base,
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-event', 'winter');
  await expect(root).toHaveAttribute('data-theme', 'winter-games');

  // The chip opens the event: its days and sports, then the medal table from Wikipedia.
  await page.locator('.event-chip').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Winter Games 2026' })).toBeVisible();
  await dialog.locator('.event-day').nth(3).click();
  await expect(dialog.locator('.event-sport').first()).toBeVisible();
  await dialog.getByRole('tab', { name: en.event.medals }).click();
  const first = dialog.locator('.medal-table tbody tr').first();
  await expect(first).toContainText('Norway');
  await expect(first).toHaveClass(/is-followed/);
  expect(wikipedia.pages).toEqual(['82241843']);
  await expect(dialog.getByRole('link', { name: en.event.medalsOpen })).toHaveAttribute(
    'href',
    'https://en.wikipedia.org/?curid=82241843',
  );

  // Another event, turned on for the first time, plays its opening animation; a key skips it.
  await dialog.locator('.event-field select').first().selectOption('summer-2028');
  await dialog.getByRole('button', { name: /^Turn on the Summer Games mode/ }).click();
  await expect(page.locator('.intro')).toBeVisible();
  await expect(page.locator('.shell')).toHaveAttribute('data-intro', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.intro')).toBeHidden();
  await expect(root).toHaveAttribute('data-event', 'summer');
  await expect(root).toHaveAttribute('data-theme', 'summer-games');

  // Turning the mode off brings the neutral theme back.
  await page.locator('.event-chip').click();
  await dialog.getByRole('button', { name: en.event.turnOff }).click();
  await expect(root).not.toHaveAttribute('data-event', /.+/);
  await expect(root).toHaveAttribute('data-theme', 'neutral');
  await app.close();
  await wikipedia.close();
});
