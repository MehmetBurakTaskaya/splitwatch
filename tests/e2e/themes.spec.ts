import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const themeIds = readdirSync('themes')
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .map((f) => f.replace(/\.json$/, ''));
const accentOf = (id: string) => JSON.parse(readFileSync(`themes/${id}.json`, 'utf8')).light.ui.accent as string;
const VIDEO_A = 'M7lc1UVf-VE';
const VIDEO_B = 'aqz-KE-bpKQ';

// No network for Live now: the feeds point at a closed port and the presets stay the shipped ones.
async function launch(settings: object): Promise<{ app: ElectronApplication; page: Page; errors: string[] }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-test-'));
  writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ clipboardSuggestions: false, ...settings }));
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      SPLITWATCH_NO_UPDATES: '1',
      SPLITWATCH_USER_DATA: dir,
      SPLITWATCH_NO_REMOTE_PRESETS: '1',
      SPLITWATCH_FEEDS_BASE: 'http://127.0.0.1:9',
    },
  });
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('127.0.0.1:9')) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForSelector('.topbar');
  return { app, page, errors };
}

const root = (page: Page) => page.locator('html');
const accent = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim());

test('the window takes the theme of the sport picked for Live now, and the backdrop moves', async () => {
  const { app, page, errors } = await launch({ sports: ['basketball'] });
  await expect(root(page)).toHaveAttribute('data-theme', 'hardwood');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-backdrop', 'hardwood');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-moving', 'true');
  expect(await accent(page)).toBe(accentOf('hardwood'));
  expect(errors).toEqual([]);
  await app.close();
});

test('every theme can be chosen in Settings and draws without errors', async () => {
  const { app, page, errors } = await launch({});
  await page.getByRole('button', { name: en.settings.open }).click();
  const dialog = page.getByRole('dialog');
  for (const id of themeIds) {
    await dialog.getByText(en.themes[id], { exact: true }).click();
    await expect(root(page)).toHaveAttribute('data-theme', id);
    expect(await accent(page)).toBe(accentOf(id));
  }
  await dialog.getByText(en.settings.themeAuto, { exact: true }).click();
  await expect(root(page)).toHaveAttribute('data-theme', 'neutral');

  // Performance mode stops the animation and turns the transitions off.
  await dialog.getByLabel(en.settings.performance).check();
  await expect(page.locator('.backdrop')).toHaveAttribute('data-moving', 'false');
  await expect(root(page)).toHaveAttribute('data-performance', '');
  expect(errors).toEqual([]);
  await app.close();
});

test('tiles show their sport, mixed sports stay neutral, and the sport can be changed by hand', async () => {
  const { app, page, errors } = await launch({
    animate: false,
    session: {
      layout: '2',
      streams: [VIDEO_A, VIDEO_B],
      selected: VIDEO_A,
      sports: { [VIDEO_A]: 'swimming', [VIDEO_B]: 'basketball' },
    },
  });
  const tileA = page.locator(`[data-stream="${VIDEO_A}"]`);
  const tileB = page.locator(`[data-stream="${VIDEO_B}"]`);
  await expect(tileA).toHaveAttribute('data-sport', 'swimming');
  await expect(tileB).toHaveAttribute('data-sport', 'basketball');
  await expect(root(page)).toHaveAttribute('data-theme', 'neutral');
  const tileAccent = await tileB.evaluate((el) => getComputedStyle(el).getPropertyValue('--tile-accent').trim());
  expect(tileAccent).toBe(accentOf('hardwood'));

  const sportName = en.sports.basketball;
  await tileB
    .getByRole('button', { name: en.tile.sport.replace('{index}', '2').replace('{sport}', sportName) })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: en.sports.swimming }).check();
  await page.keyboard.press('Escape');
  await expect(tileB).toHaveAttribute('data-sport', 'swimming');
  await expect(root(page)).toHaveAttribute('data-theme', 'pool');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-moving', 'false');
  expect(errors).toEqual([]);
  await app.close();
});
