import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type ElectronApplication, _electron as electron, expect, test } from '@playwright/test';
import { tempDir } from './temp';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const VIDEO_A = 'M7lc1UVf-VE';
const VIDEO_B = 'aqz-KE-bpKQ';

function freshUserData(settings: object = {}): string {
  const dir = tempDir('splitwatch-test-');
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, language: 'en', welcomeSeen: true, ...settings }),
  );
  return dir;
}

function launch(userData: string, ...args: string[]): Promise<ElectronApplication> {
  return electron.launch({
    args: ['.', ...args],
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: userData },
  });
}

const windowCount = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);

test('with the tray on, closing the window keeps the app, and starting it again brings the window back', async () => {
  const app = await launch(
    freshUserData({ background: true, session: { layout: '1', streams: [VIDEO_A], selected: VIDEO_A } }),
  );
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
  await expect.poll(() => windowCount(app)).toBe(0);
  await new Promise((r) => setTimeout(r, 1000));
  expect(await windowCount(app)).toBe(0);

  // A second start (or the tray) opens a new window with the same grid.
  const next = app.waitForEvent('window');
  await app.evaluate(({ app: a }) => a.emit('second-instance'));
  const again = await next;
  await expect(again.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();

  // Asks from the tray reach the page: here, adding a live stream.
  await again.waitForTimeout(500);
  await app.evaluate(
    ({ BrowserWindow }, id) =>
      BrowserWindow.getAllWindows()[0]!.webContents.send('app:command', {
        type: 'add',
        videoId: id,
        sport: 'swimming',
      }),
    VIDEO_B,
  );
  await expect(again.locator(`[data-stream="${VIDEO_B}"]`)).toHaveAttribute('data-sport', 'swimming');
  await expect(again.locator(`[data-stream="${VIDEO_B}"]`)).toHaveClass(/is-selected/);

  // The media keys' asks: the next stream (round to the first) and the previous one.
  const send = (type: string) =>
    app.evaluate(
      ({ BrowserWindow }, t) => BrowserWindow.getAllWindows()[0]!.webContents.send('app:command', { type: t }),
      type,
    );
  await send('selectNext');
  await expect(again.locator(`[data-stream="${VIDEO_A}"]`)).toHaveClass(/is-selected/);
  await send('selectPrevious');
  await expect(again.locator(`[data-stream="${VIDEO_B}"]`)).toHaveClass(/is-selected/);
  await app.close();
});

test('started hidden at sign-in, the app waits in the tray without a window', async () => {
  const app = await launch(freshUserData({ background: true, startHidden: true }), '--hidden');
  await new Promise((r) => setTimeout(r, 3000));
  expect(await windowCount(app)).toBe(0);
  const next = app.waitForEvent('window');
  await app.evaluate(({ app: a }) => a.emit('second-instance'));
  await (await next).waitForSelector('.topbar');
  await app.close();
});

test('Settings offers the tray and explains that starting with the system needs the installed app', async () => {
  const app = await launch(freshUserData());
  const page = await app.firstWindow();
  await page.locator('.topbar').getByRole('button', { name: en.settings.open }).click();
  const background = page.getByRole('checkbox', { name: /^Keep Splitwatch in the/ });
  const startHidden = page.getByRole('checkbox', { name: /^Start in the/ });
  await expect(page.getByRole('checkbox', { name: en.settings.startAtLogin })).toBeDisabled();
  await expect(page.getByText(en.settings.startUnavailable)).toBeVisible();
  await expect(startHidden).toBeDisabled();
  await background.check();
  await page.waitForTimeout(600);
  const dir = (await app.evaluate(({ app: a }) => a.getPath('userData'))) as string;
  expect(JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8')).background).toBe(true);
  await app.close();
});
