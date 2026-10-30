import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const VIDEO_A = 'M7lc1UVf-VE'; // the video YouTube's own IFrame API documentation embeds
const VIDEO_B = 'aqz-KE-bpKQ';

// Every test gets its own settings folder, with the clipboard suggestion off so the machine's
// clipboard cannot change what the test sees.
function freshUserData(settings: object = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-test-'));
  writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ clipboardSuggestions: false, ...settings }));
  return dir;
}

async function launch(userData: string, ...args: string[]): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.', ...args],
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: userData },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  return { app, page };
}

async function addStream(page: Page, text: string): Promise<void> {
  await page.getByLabel(en.add.label).fill(text);
  await page.getByRole('button', { name: en.add.button, exact: true }).click();
}

test('starts empty, with a CSP and no Node.js in the page', async () => {
  const { app, page } = await launch(freshUserData());
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.empty.title);
  expect(await page.title()).toBe('Splitwatch');
  const globals = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    return [location.origin, typeof w.require, typeof w.process, typeof w.splitwatch];
  });
  expect(globals).toEqual(['app://splitwatch', 'undefined', 'undefined', 'object']);
  const csp = await page.evaluate(async () => (await fetch(location.href)).headers.get('content-security-policy'));
  expect(csp).toContain("default-src 'self'");
  expect(errors).toEqual([]);
  await app.close();
});

test('adds streams, grows the layout, and handles shortcuts', async () => {
  const { app, page } = await launch(freshUserData());

  await addStream(page, 'not a link');
  await expect(page.getByRole('alert')).toHaveText(en.add.invalid);

  await addStream(page, `https://youtu.be/${VIDEO_A}`);
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '1');

  await addStream(page, `https://www.youtube.com/watch?v=${VIDEO_B}`);
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '2');
  await expect(page.locator(`[data-stream="${VIDEO_B}"]`)).toHaveAttribute('data-slot', '1');

  await addStream(page, VIDEO_A);
  await expect(page.getByRole('alert')).toHaveText(en.add.duplicate);

  // Keyboard: pick stream 2, move it earlier, next layout, help.
  await page.locator('.brand').click();
  await page.keyboard.press('2');
  await expect(page.locator(`[data-stream="${VIDEO_B}"]`)).toHaveClass(/is-audible/);

  // Moving a stream must not reload any player: once both players have answered (ready or error),
  // count iframe loads across the move.
  for (const id of [VIDEO_A, VIDEO_B]) {
    await expect(page.locator(`[data-stream="${id}"]`)).not.toHaveAttribute('data-state', 'loading', {
      timeout: 45_000,
    });
  }
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const w = window as unknown as { frameLoads: number };
    w.frameLoads = 0;
    document.querySelectorAll('iframe').forEach((f) => f.addEventListener('load', () => w.frameLoads++));
  });
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator(`[data-stream="${VIDEO_B}"]`)).toHaveAttribute('data-slot', '0');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { frameLoads: number }).frameLoads)).toBe(0);

  // F enlarges the picked stream, Escape goes back to the grid.
  await page.keyboard.press('f');
  await expect(page.locator('.grid')).toHaveClass(/maximized/);
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.grid')).not.toHaveClass(/maximized/);
  await page.keyboard.press('l');
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '3');
  await page.keyboard.press('m');
  await expect(page.locator(`[data-stream="${VIDEO_B}"]`)).not.toHaveClass(/is-audible/);
  await page.keyboard.press('Shift+?');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // Removing a stream leaves an empty slot that leads back to the input.
  await page.getByRole('button', { name: new RegExp(en.tile.remove.replace('{index}', '1')) }).click();
  await expect(page.locator('[data-stream]')).toHaveCount(1);
  await app.close();
});

test('restores the last session after a restart', async () => {
  const userData = freshUserData();
  let { app, page } = await launch(userData);
  await addStream(page, VIDEO_A);
  await addStream(page, VIDEO_B);
  await page.locator('.brand').click();
  await page.keyboard.press('l');
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '3');
  await page.waitForTimeout(1000);
  await app.close();

  ({ app, page } = await launch(userData));
  await expect(page.locator('[data-stream]')).toHaveCount(2);
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '3');

  // YouTube allows one player to start by itself: the selected stream does, the other waits.
  const src = (id: string) => page.locator(`[data-stream="${id}"] iframe`).getAttribute('src');
  await expect(page.locator(`[data-stream="${VIDEO_B}"] iframe`)).toBeAttached({ timeout: 45_000 });
  expect(await src(VIDEO_A)).toContain('autoplay=1');
  expect(await src(VIDEO_B)).toContain('autoplay=0');
  const playAll = page.getByRole('button', { name: en.playAll.button });
  await expect(playAll).toBeVisible();

  // The top bar stays on one line at the smallest window width.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(720, 600));
  await expect.poll(() => page.locator('.topbar').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('.topbar').getByRole('button', { name: en.settings.open })).toBeInViewport();
  await playAll.click();
  await expect(playAll).toBeHidden();
  await app.close();
});

// Needs real playback, which YouTube's bot check often withholds from CI runners.
test('pauses the streams that leave the screen and resumes them', async () => {
  test.skip(!!process.env.CI, 'needs YouTube playback');
  const { app, page } = await launch(freshUserData());
  await addStream(page, VIDEO_A);
  await addStream(page, VIDEO_B);
  const tileA = page.locator(`[data-stream="${VIDEO_A}"]`);
  const tileB = page.locator(`[data-stream="${VIDEO_B}"]`);
  const running = /^(playing|buffering)$/;
  for (const tile of [tileA, tileB]) await expect(tile).toHaveAttribute('data-state', 'playing', { timeout: 45_000 });

  // The enlarged view hides stream B.
  await page.locator('.brand').click();
  await page.keyboard.press('1');
  await page.keyboard.press('f');
  await expect(tileB).not.toHaveAttribute('data-state', running);
  await expect(tileA).toHaveAttribute('data-state', running);
  await page.keyboard.press('Escape');
  await expect(tileB).toHaveAttribute('data-state', running);

  // A minimized window shows nothing.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.minimize());
  for (const tile of [tileA, tileB]) await expect(tile).not.toHaveAttribute('data-state', running);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.restore());
  for (const tile of [tileA, tileB]) await expect(tile).toHaveAttribute('data-state', running);
  await app.close();
});

// YouTube must accept the app's identification. Error 153 means it did not; it arrives right after
// the player is ready. On CI runners YouTube's bot check often stops playback (error 150, or a player
// that never starts); that is a network effect, not a failure here.
test('YouTube accepts the app identification (no error 153)', async () => {
  const { app, page } = await launch(freshUserData());
  await addStream(page, VIDEO_A);
  const tile = page.locator(`[data-stream="${VIDEO_A}"]`);
  await expect(tile).not.toHaveAttribute('data-state', 'loading', { timeout: 45_000 });
  if (process.env.CI) await page.waitForTimeout(8000);
  else await expect(tile).toHaveAttribute('data-state', /^(playing|buffering|error)$/, { timeout: 30_000 });
  const [state, error] = await Promise.all([tile.getAttribute('data-state'), tile.getAttribute('data-error')]);
  test.info().annotations.push({ type: 'player', description: `${state} ${error ?? ''}` });
  expect(error).not.toBe('153');
  if (!process.env.CI) expect(['playing', 'buffering']).toContain(state);
  await app.close();
});

test('the right-to-left pseudo-locale mirrors the layout', async () => {
  const { app, page } = await launch(freshUserData(), '--locale=ar-XB');
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir])).toEqual([
    'ar-XB',
    'rtl',
  ]);
  const border = await page.locator('.empty-card').evaluate((el) => getComputedStyle(el).borderRightWidth);
  expect(border).toBe('4px');
  await app.close();
});

test('the long pseudo-locale still fits the window', async () => {
  const { app, page } = await launch(freshUserData(), '--locale=en-XA');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('[');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await app.close();
});

test('dialogs close from outside the box and from Enter on a choice, and keep a typed key', async () => {
  const { app, page } = await launch(freshUserData());
  const dialog = page.getByRole('dialog');
  const openSettings = () => page.locator('.topbar').getByRole('button', { name: en.settings.open }).click();

  await openSettings();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 300);
  await expect(dialog).toBeHidden();

  // Settings apply at once, so Enter on a checkbox closes the dialog.
  await openSettings();
  await page.getByRole('checkbox', { name: en.settings.performance }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();

  // A typed key that was not saved: closing asks first, with Save focused.
  await openSettings();
  await page.getByLabel(en.settings.keyLabel).fill('not-a-real-key-but-long-enough-0000');
  await page.keyboard.press('Escape');
  await expect(page.getByText(en.settings.keyUnsaved)).toBeVisible();
  await expect(dialog.locator('.dialog-footer').getByRole('button', { name: en.settings.keySave })).toBeFocused();
  await dialog.getByRole('button', { name: en.settings.keyDiscard }).click();
  await expect(dialog).toBeHidden();

  // The close button in the corner.
  await openSettings();
  await dialog.locator('.dialog-head').getByRole('button', { name: en.dialog.close }).click();
  await expect(dialog).toBeHidden();
  await app.close();
});
