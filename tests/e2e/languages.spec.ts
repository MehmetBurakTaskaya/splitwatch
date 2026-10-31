import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';
import { SUPPORTED_LOCALES } from '../../src/shared/locales';
import { tempDir } from './temp';

const read = (tag: string) => JSON.parse(readFileSync(`src/renderer/i18n/locales/${tag}.json`, 'utf8'));
const en = read('en');
const VIDEO_A = 'M7lc1UVf-VE';
const VIDEO_B = 'aqz-KE-bpKQ';

function userData(settings: object): string {
  const dir = tempDir('splitwatch-lang-');
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, welcomeSeen: true, ...settings }),
  );
  return dir;
}

async function launch(dir: string, ...args: string[]): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.', ...args],
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: dir },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  return { app, page };
}

test('the language follows the setting at once, and after a restart', async () => {
  const tr = read('tr');
  const ar = read('ar');
  const dir = userData({ language: 'en' });
  let { app, page } = await launch(dir);
  await page.getByRole('button', { name: en.settings.open }).click();
  await page.getByLabel(en.settings.language).selectOption('tr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByRole('heading', { name: tr.settings.title, exact: true })).toBeVisible();
  await expect(page.getByText(tr.settings.languageUnreviewed)).toBeVisible();

  await page.getByLabel(tr.settings.language).selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await app.close();

  ({ app, page } = await launch(dir));
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByLabel(ar.add.label)).toBeVisible();
  await app.close();
});

// The top bar keeps to one line in every language, with the event chip and Play all showing.
for (const tag of SUPPORTED_LOCALES.filter((t) => t !== 'en')) {
  test(`the top bar fits in ${tag}`, async () => {
    const { app, page } = await launch(
      userData({
        language: tag,
        event: { active: 'summer-2028', introSeen: ['summer-2028'] },
        session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A },
      }),
    );
    await expect(page.locator('html')).toHaveAttribute('lang', tag);
    await expect(page.locator('.event-chip')).toBeVisible();
    for (const width of [1280, 1024, 900, 720]) {
      await app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0]!.setSize(w, 640), width);
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const bar = document.querySelector('.topbar')!;
              return bar.scrollWidth <= bar.clientWidth && document.documentElement.scrollWidth <= window.innerWidth;
            }),
          { message: `${tag} at ${width} px` },
        )
        .toBe(true);
    }
    await app.close();
  });
}
