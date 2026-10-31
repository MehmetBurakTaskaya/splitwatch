import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const VIDEO_A = 'M7lc1UVf-VE'; // the video YouTube's own IFrame API documentation embeds
const VIDEO_B = 'aqz-KE-bpKQ';

// Every test gets its own settings folder, with the clipboard suggestion off and English as the
// language, so that the machine's clipboard and languages cannot change what the test sees.
function freshUserData(settings: object = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-test-'));
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, language: 'en', welcomeSeen: true, ...settings }),
  );
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
  // Nothing may cover a player: the grid hides while a dialog shows.
  await expect(page.locator('.grid')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.grid')).toBeVisible();

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

  // A dialog hides the grid. (A player hidden while it still buffers stays buffering, without
  // playing; this waits until both play.)
  for (const tile of [tileA, tileB]) await expect(tile).toHaveAttribute('data-state', 'playing');
  await page.locator('.brand').click();
  await page.keyboard.press('Shift+?');
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const tile of [tileA, tileB]) await expect(tile).not.toHaveAttribute('data-state', running);
  await page.keyboard.press('Escape');
  for (const tile of [tileA, tileB]) await expect(tile).toHaveAttribute('data-state', running);

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

test('the top bar stays on one line at any width, with its longest labels', async () => {
  const { app, page } = await launch(
    freshUserData({
      event: { active: 'summer-2028', introSeen: ['summer-2028'] },
      session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A },
    }),
    '--locale=en-XA',
  );
  await expect(page.locator('.event-chip')).toBeVisible();
  await expect(page.locator('.play-all')).toBeVisible();
  for (const width of [1280, 1024, 900, 720]) {
    await app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0]!.setSize(w, 640), width);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const bar = document.querySelector('.topbar')!;
          return bar.scrollWidth <= bar.clientWidth && document.documentElement.scrollWidth <= window.innerWidth;
        }),
      )
      .toBe(true);
  }
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

test('saves, opens, renames and deletes layouts, and keeps them after a restart', async () => {
  const userData = freshUserData();
  let { app, page } = await launch(userData);
  const dialog = page.getByRole('dialog');
  await addStream(page, VIDEO_A);
  await addStream(page, VIDEO_B);

  // Ctrl + S opens the dialog with the name field ready; Enter saves.
  await page.keyboard.press('Control+s');
  await expect(dialog.getByLabel(en.layouts.nameLabel)).toBeFocused();
  await page.keyboard.type('Finals');
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Saved as “Finals”.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: new RegExp(en.tile.remove.replace('{index}', '2')) }).click();
  await expect(page.locator('[data-stream]')).toHaveCount(1);
  await page.locator('.topbar').getByRole('button', { name: en.layouts.title }).click();
  await dialog.getByRole('button', { name: 'Open Finals' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-stream]')).toHaveCount(2);
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '2');

  // Rename, then delete and undo.
  await page.keyboard.press('Control+s');
  await dialog.getByRole('button', { name: 'Rename Finals' }).click();
  await dialog.getByLabel('New name for Finals').fill('Sunday');
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Delete Sunday' }).click();
  await expect(dialog.getByText(en.layouts.none)).toBeVisible();
  await dialog.getByRole('button', { name: en.layouts.undo }).click();
  await expect(dialog.getByRole('button', { name: 'Open Sunday' })).toBeVisible();
  await page.waitForTimeout(800);
  await app.close();

  ({ app, page } = await launch(userData));
  await page.keyboard.press('Control+s');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Open Sunday' })).toBeVisible();
  await app.close();
});

test('the mini player shows the picked stream on top of other windows, and goes back', async () => {
  const { app, page } = await launch(
    freshUserData({ session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_B } }),
  );
  const tileA = page.locator(`[data-stream="${VIDEO_A}"]`);
  const tileB = page.locator(`[data-stream="${VIDEO_B}"]`);
  const win = () =>
    app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      return { onTop: w.isAlwaysOnTop(), content: w.getContentBounds(), outer: w.getBounds() };
    });
  const before = await win();

  await page.locator('.brand').click();
  await page.keyboard.press('i');
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(tileA).toBeHidden();
  await expect(tileB).toBeVisible();
  await expect.poll(async () => (await win()).onTop).toBe(true);
  // Display scaling can round the window's size by a pixel or two.
  type Box = Partial<Record<'x' | 'y' | 'width' | 'height', number>>;
  const near = (a: Box, b: Box) => (Object.keys(b) as (keyof Box)[]).every((k) => Math.abs(a[k]! - b[k]!) <= 4);
  expect(near((await win()).content, { width: 490, height: 316 })).toBe(true);
  // YouTube's minimum player size holds in the mini player too.
  const frame = await tileB.locator('.tile-player').boundingBox();
  expect(frame!.width).toBeGreaterThanOrEqual(200);
  expect(frame!.height).toBeGreaterThanOrEqual(200);

  // A moved mini player opens in the same place next time.
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]!.setContentBounds({ x: 100, y: 120, width: 520, height: 330 }),
  );
  await page.getByRole('button', { name: en.tile.leaveMini }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(tileA).toBeVisible();
  await expect.poll(async () => (await win()).onTop).toBe(false);
  expect(near((await win()).outer, before.outer)).toBe(true);

  await page.getByRole('button', { name: en.tile.mini.replace('{index}', '1') }).click();
  await expect(tileB).toBeHidden();
  await expect(tileA).toBeVisible();
  await expect.poll(async () => near((await win()).content, { x: 100, y: 120, width: 520, height: 330 })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.topbar')).toBeVisible();
  await app.close();
});

test('spoiler protection blurs titles until they are pointed at', async () => {
  const { app, page } = await launch(
    freshUserData({ spoilers: true, session: { layout: '1', streams: [VIDEO_A], selected: VIDEO_A } }),
  );
  const title = page.locator('.tile-name .spoiler');
  await expect(title).toHaveCSS('filter', 'blur(6px)');
  await page.locator('.tile-bar').hover();
  await expect(title).toHaveCSS('filter', 'none');
  await app.close();
});

test('a layout link asks first, then opens or keeps the shared layout', async () => {
  const { app, page } = await launch(freshUserData());
  const link = `splitwatch://layout?l=2&v=${VIDEO_A},${VIDEO_B}&s=,swimming&n=Finals%20night`;
  // Windows and Linux hand a link to the running app as a second start.
  await app.evaluate(({ app: a }, url) => a.emit('second-instance', {}, ['Splitwatch.exe', url]), link);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: en.shared.title })).toBeVisible();
  await expect(dialog).toContainText('Finals night');
  await expect(page.locator('[data-stream]')).toHaveCount(0);
  await dialog.getByRole('button', { name: en.shared.save }).click();
  await expect(dialog.getByText(en.shared.saved)).toBeVisible();
  await dialog.getByRole('button', { name: en.shared.open }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-stream]')).toHaveCount(2);
  await expect(page.locator(`[data-stream="${VIDEO_B}"]`)).toHaveAttribute('data-sport', 'swimming');
  await page.keyboard.press('Control+s');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Open Finals night' })).toBeVisible();
  await app.close();
});

test('a stream pops out into its own window with its sound, and comes back', async () => {
  const { app, page } = await launch(
    freshUserData({ session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A, muted: false } }),
  );
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();
  const opened = app.waitForEvent('window');
  await page.getByRole('button', { name: en.tile.popout.replace('{index}', '1') }).click();
  const popout = await opened;
  await expect(popout.locator('.popout')).toBeVisible();
  // The heard stream takes its sound along.
  await expect(popout.getByRole('button', { name: en.popout.soundOn })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`[data-popped="${VIDEO_A}"]`)).toBeVisible();
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toHaveCount(0);

  await page.locator(`[data-popped="${VIDEO_A}"]`).getByRole('button', { name: en.popout.back }).click();
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  await app.close();
});

test('the live chat opens beside the grid, read-only, and closes', async () => {
  const { app, page } = await launch(
    freshUserData({ session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A } }),
  );
  // The panel narrows the tiles, which may then hide their less needed buttons, this one too.
  const open = page.getByRole('button', { name: en.chat.open.replace('{index}', '2') });
  await open.click();
  const frame = page.locator('.chat iframe');
  // YouTube refuses its chat in a frame unless the embedding site names itself.
  await expect(frame).toHaveAttribute(
    'src',
    new RegExp(`v=${VIDEO_B}&embed_domain=com\\.mehmetburaktaskaya\\.splitwatch`),
  );
  await expect(page.getByRole('link', { name: en.chat.browser })).toHaveAttribute(
    'href',
    `https://www.youtube.com/live_chat?is_popout=1&v=${VIDEO_B}`,
  );
  const grid = await page.locator('.grid').boundingBox();
  const chat = await page.locator('.chat').boundingBox();
  expect(grid && chat && grid.x + grid.width <= chat.x + 1).toBe(true);

  await page.getByRole('button', { name: en.chat.close }).click();
  await expect(page.locator('.chat')).toHaveCount(0);
  // The chat goes with its stream.
  await open.click();
  await page.locator(`[data-stream="${VIDEO_B}"]`).hover();
  await page.getByRole('button', { name: en.tile.remove.replace('{index}', '2') }).click();
  await expect(page.locator('.chat')).toHaveCount(0);
  await app.close();
});

test('the line-up panel holds a stream back beside the grid, instead of a chat', async () => {
  const { app, page } = await launch(
    freshUserData({ session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A } }),
  );
  const toggle = page.getByRole('button', { name: en.sync.open });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const rows = page.locator('.sync-row');
  await expect(rows).toHaveCount(2);
  const row = page.locator(`[data-sync="${VIDEO_B}"]`);
  const sooner = row.getByRole('button', { name: en.sync.minus.replace('{seconds}', '1') });
  await expect(sooner).toBeDisabled();
  await expect(row.locator('output')).toHaveText('No delay');

  // The selected stream starts by itself; the other waits.
  if (!process.env.CI) {
    const first = page.locator(`[data-sync="${VIDEO_A}"]`);
    await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toHaveAttribute('data-state', 'playing', {
      timeout: 45_000,
    });
    await first.getByRole('button', { name: en.sync.plus.replace('{seconds}', '5') }).click();
    await expect(first.locator('output')).toHaveText('5 s behind');
    await first.getByRole('button', { name: en.sync.reset }).click();
    await expect(first.locator('output')).toHaveText('No delay');
  }

  // One panel at a time: a chat takes the line-up's place, and the line-up the chat's.
  await toggle.click();
  await expect(page.locator('.sync')).toHaveCount(0);
  await page.getByRole('button', { name: en.chat.open.replace('{index}', '1') }).click();
  await expect(page.locator('.chat')).toHaveCount(1);
  await toggle.click();
  await expect(page.locator('.chat')).toHaveCount(0);
  await expect(page.locator('.sync')).toHaveCount(1);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await app.close();
});

test('your watching shows the time by sport and the latest streams, which go back on the grid', async () => {
  const userData = freshUserData();
  const now = Date.now();
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  writeFileSync(
    path.join(userData, 'watch.json'),
    JSON.stringify({
      entries: [
        {
          videoId: VIDEO_A,
          title: 'Heat 3',
          channel: 'Pool TV',
          sport: 'swimming',
          lastAt: now,
          seconds: 5400,
          days: { [today]: 5400 },
        },
      ],
      totals: { seconds: 7200, sports: { swimming: 5400, none: 1800 }, since: now - 86_400_000 },
    }),
  );
  const { app, page } = await launch(userData);
  await page.getByRole('button', { name: en.history.open }).click();
  const dialog = page.getByRole('dialog', { name: en.history.title });
  await expect(dialog.locator('.watch-totals dd')).toHaveText(['1 h 30 min', '1 h 30 min', '2 h 0 min']);
  await expect(dialog.locator('.watch-bars').first().locator('li')).toHaveCount(2);
  await dialog.getByRole('button', { name: en.history.addLabel.replace('{title}', 'Heat 3') }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();

  await page.getByRole('button', { name: en.settings.open }).click();
  await page.getByRole('button', { name: en.history.open }).click();
  await dialog.getByRole('button', { name: en.history.clearOpen }).click();
  await dialog.getByRole('button', { name: en.history.clear, exact: true }).click();
  await expect(dialog.getByText(en.history.empty)).toBeVisible();
  await app.close();
});

test('the waiting screen counts down to the next streams and puts a started one on the grid', async () => {
  const now = Date.now();
  const at = (ms: number) => new Date(now + ms).toISOString();
  const { app, page } = await launch(
    freshUserData({
      reminders: [
        { videoId: VIDEO_B, title: 'Final', channel: 'Pool TV', at: at(90 * 60_000 + 20_000) },
        { videoId: VIDEO_A, title: 'Heat 3', channel: 'Pool TV', at: at(-5 * 60_000), notified: true },
      ],
    }),
  );
  await page.getByRole('button', { name: en.ambient.open }).click();
  await expect(page.locator('.ambient-time')).toBeVisible();
  await expect(page.locator('.topbar')).toHaveCount(0);
  await expect(page.locator('.ambient-when')).toHaveText([en.ambient.now, 'In 1 h 31 min']);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ambient')).toHaveCount(0);

  await page.getByRole('button', { name: en.ambient.open }).click();
  await page.getByRole('button', { name: en.ambient.watchLabel.replace('{title}', 'Heat 3') }).click();
  await expect(page.locator('.ambient')).toHaveCount(0);
  await expect(page.locator(`[data-stream="${VIDEO_A}"]`)).toBeVisible();
  await app.close();
});

test('quiet theme sounds stay off until turned on, then sound for streams that come and go', async () => {
  const { app, page } = await launch(freshUserData());
  // Count the tones the page makes.
  await page.evaluate(() => {
    const counted = window as unknown as { tones: number };
    counted.tones = 0;
    const Base = window.AudioContext;
    window.AudioContext = class extends Base {
      override createOscillator() {
        counted.tones++;
        return super.createOscillator();
      }
    };
  });
  const tones = () => page.evaluate(() => (window as unknown as { tones: number }).tones);
  await addStream(page, VIDEO_A);
  expect(await tones()).toBe(0);

  await page.getByRole('button', { name: en.settings.open }).click();
  const try_ = page.getByRole('button', { name: en.settings.soundsTry });
  await expect(try_).toBeDisabled();
  await page.getByLabel(en.settings.sounds).check();
  await try_.click();
  await expect.poll(tones).toBe(3);
  await page.keyboard.press('Escape');
  await addStream(page, VIDEO_B);
  await expect.poll(tones).toBe(5);
  await app.close();
});

test('a reminder that goes out reaches the page, which sounds and keeps showing it', async () => {
  const at = new Date(Date.now() + 2 * 60_000 + 12_000).toISOString();
  const { app, page } = await launch(
    freshUserData({ sounds: true, reminders: [{ videoId: VIDEO_B, title: 'Final', channel: 'Pool TV', at }] }),
  );
  await page.evaluate(() => {
    const counted = window as unknown as { tones: number };
    counted.tones = 0;
    const Base = window.AudioContext;
    window.AudioContext = class extends Base {
      override createOscillator() {
        counted.tones++;
        return super.createOscillator();
      }
    };
  });
  await page.getByRole('button', { name: en.ambient.open }).click();
  await expect(page.locator('.ambient-title')).toHaveText(['Final']);
  // The reminder goes out two minutes before the start.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { tones: number }).tones), { timeout: 30_000 })
    .toBe(3);
  await expect(page.locator('.ambient-title')).toHaveText(['Final']);
  await app.close();
});

test('the first-run guide shows once, until it is read', async () => {
  const userData = freshUserData({ welcomeSeen: false });
  let { app, page } = await launch(userData);
  await expect(page.getByRole('heading', { name: en.welcome.title })).toBeVisible();
  await expect(page.locator('.welcome-steps li')).toHaveCount(3);
  await page.getByRole('button', { name: en.welcome.done }).click();
  await expect(page.getByRole('heading', { name: en.empty.title })).toBeVisible();
  await app.close();
  ({ app, page } = await launch(userData));
  await expect(page.getByRole('heading', { name: en.empty.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: en.welcome.title })).toHaveCount(0);
  await app.close();
});
