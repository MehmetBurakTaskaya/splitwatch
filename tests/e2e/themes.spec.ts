import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
// The themes offered in Settings; the Summer and Winter Games themes come with their event modes.
const themeIds = readdirSync('themes')
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .filter((f) => !JSON.parse(readFileSync(`themes/${f}`, 'utf8')).event)
  .map((f) => f.replace(/\.json$/, ''));
const accentOf = (id: string) => JSON.parse(readFileSync(`themes/${id}.json`, 'utf8')).light.ui.accent as string;
const VIDEO_A = 'M7lc1UVf-VE';
const VIDEO_B = 'aqz-KE-bpKQ';

// No network for Live now: the feeds point at a closed port and the presets stay the shipped ones.
async function launch(settings: object): Promise<{ app: ElectronApplication; page: Page; errors: string[] }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-test-'));
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, language: 'en', ...settings }),
  );
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

test('makes a theme of your own, keeps it easy to read, and shares it as a file', async () => {
  const { app, page } = await launch({ colorScheme: 'light' });
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'splitwatch-theme-')), 'evening.json');
  const cssVar = (name: string) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

  await page.getByRole('button', { name: en.settings.open }).click();
  await page.getByRole('button', { name: en.settings.themeNew }).click();
  const editor = page.getByRole('dialog', { name: en.themeEditor.newTitle });
  await expect(editor.getByLabel(en.themeEditor.name)).toHaveValue(en.themeEditor.defaultName);
  await editor.getByLabel(en.settings.schemeLight).check();

  // Pale text cannot be saved, and the whole app wears the theme while it is edited.
  const text = editor.getByLabel(en.themeEditor.uiRoles.text, { exact: true });
  await text.fill('#d0d0d0');
  await expect(editor.getByRole('button', { name: en.themeEditor.save })).toBeDisabled();
  await expect(editor.locator('.theme-check li')).toHaveCount(3);
  expect(await cssVar('--color-text')).toBe('#d0d0d0');
  await text.fill('#202020');
  await expect(editor.locator('.theme-check li')).toHaveCount(0);
  await editor.getByLabel(en.themeEditor.name).fill('Evening');
  await editor.getByRole('button', { name: en.themeEditor.save }).click();

  const settings = page.getByRole('dialog', { name: en.settings.title });
  const mine = settings.getByRole('radio', { name: /^Evening/ });
  await expect(mine).toBeChecked();
  expect(await cssVar('--color-text')).toBe('#202020');

  // Out to a file and back in.
  await app.evaluate(({ dialog }, f) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: f })) as never;
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [f] })) as never;
  }, file);
  await settings.getByRole('button', { name: en.settings.themeExport }).click();
  await expect(settings.locator('.theme-tools [role=status]')).toHaveText(en.settings.themeExported);
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  expect(saved).toMatchObject({ id: 'evening', name: 'Evening', sports: [] });

  await settings.getByRole('button', { name: en.settings.themeDelete }).click();
  await settings.getByRole('alert').getByRole('button', { name: en.settings.themeDelete }).click();
  await expect(mine).toHaveCount(0);
  await settings.getByRole('button', { name: en.settings.themeImport }).click();
  await expect(settings.locator('.theme-tools [role=status]')).toHaveText(
    en.settings.themeAdded.replace('{name}', 'Evening'),
  );
  await expect(mine).toBeChecked();

  // A file whose text would be hard to read stays out.
  const pale = { ...saved, id: 'pale', light: { ...saved.light, ui: { ...saved.light.ui, text: '#eeeeee' } } };
  writeFileSync(file, JSON.stringify(pale));
  await settings.getByRole('button', { name: en.settings.themeImport }).click();
  await expect(settings.locator('.theme-tools [role=status]')).toHaveText(en.settings.themeContrast);
  await app.close();
});
