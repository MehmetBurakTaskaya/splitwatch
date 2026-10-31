import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

// A stand-in for the YouTube Data API and the channel feeds, so these tests spend no real quota
// and do not depend on what is live today.
const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const LIVE = 'M7lc1UVf-VE';
const FOUND = 'aqz-KE-bpKQ';
const UPCOMING = 'dQw4w9WgXcQ';
// Two days from now, at a full hour.
const UPCOMING_AT = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000 + 2 * 86_400_000).toISOString();
const KEY = 'test-key-0123456789abcdef';

interface Fake {
  base: string;
  calls: string[];
  close(): Promise<void>;
}

function feed(channelId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <entry>
  <yt:videoId>${LIVE}</yt:videoId>
  <yt:channelId>${channelId}</yt:channelId>
  <title>Fake live final</title>
  <author><name>Fake federation</name></author>
  <published>2026-10-30T15:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>${UPCOMING}</yt:videoId>
  <yt:channelId>${channelId}</yt:channelId>
  <title>Fake semifinal</title>
  <author><name>Fake federation</name></author>
  <published>2026-10-30T14:00:00+00:00</published>
 </entry>
</feed>`;
}

async function startFake(): Promise<Fake> {
  const calls: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    calls.push(url.pathname);
    const json = (body: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/feeds/videos.xml') {
      res.writeHead(200, { 'content-type': 'application/atom+xml' });
      return res.end(feed(url.searchParams.get('channel_id') ?? ''));
    }
    if (url.searchParams.get('key') !== KEY) {
      return json({ error: { code: 400, message: 'API key not valid.', errors: [{ reason: 'badRequest' }] } }, 400);
    }
    if (url.pathname === '/youtube/v3/videos') {
      const ids = (url.searchParams.get('id') ?? '').split(',');
      return json({
        items: ids.map((id) => ({
          id,
          snippet: {
            title: id === LIVE ? 'Fake live final' : id === UPCOMING ? 'Fake semifinal' : 'Other',
            channelTitle: 'Fake federation',
            liveBroadcastContent: id === LIVE ? 'live' : id === UPCOMING ? 'upcoming' : 'none',
          },
          ...(id === UPCOMING ? { liveStreamingDetails: { scheduledStartTime: UPCOMING_AT } } : {}),
          status: { embeddable: true },
        })),
      });
    }
    if (url.pathname === '/youtube/v3/search') {
      return json({
        items: [
          {
            id: { videoId: FOUND },
            snippet: { title: 'Fake found stream', channelTitle: 'Fake channel', liveBroadcastContent: 'live' },
          },
        ],
      });
    }
    json({ error: { code: 404, errors: [{ reason: 'notFound' }] } }, 404);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    calls,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function launch(
  fake: Fake,
  withKey: boolean,
  settings: object = {},
  beforeWindow?: (app: ElectronApplication) => Promise<void>,
): Promise<{ app: ElectronApplication; page: Page }> {
  const userData = mkdtempSync(path.join(tmpdir(), 'splitwatch-api-'));
  writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ clipboardSuggestions: false, ...settings }));
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      SPLITWATCH_NO_UPDATES: '1',
      SPLITWATCH_NO_REMOTE_PRESETS: '1',
      SPLITWATCH_USER_DATA: userData,
      SPLITWATCH_YOUTUBE_API_BASE: `${fake.base}/youtube/v3`,
      SPLITWATCH_FEEDS_BASE: fake.base,
      ...(withKey ? { SPLITWATCH_TEST_API_KEY: KEY } : {}),
      SPLITWATCH_NOTIFY_EVERY: '4000',
    },
  });
  await beforeWindow?.(app);
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  return { app, page };
}

let fake: Fake;
test.beforeEach(async () => {
  fake = await startFake();
});
test.afterEach(async () => {
  await fake.close();
});

test('without a key: the latest preset videos from the feeds, and search asks for a key', async () => {
  const { app, page } = await launch(fake, false);
  await expect(page.getByRole('heading', { name: en.live.latestTitle })).toBeVisible();
  await expect(page.locator('.live-now .stream-item').first()).toContainText('Fake live final');
  expect(fake.calls.some((c) => c.startsWith('/youtube/v3'))).toBe(false);

  await page.keyboard.press('Control+k');
  await page.getByLabel(en.search.label).fill('final');
  await expect(page.getByText(en.search.noKey)).toBeVisible();
  await app.close();
});

test('with a key: Live now, search with its cost, LIVE badges and the quota count', async () => {
  const { app, page } = await launch(fake, true);

  // Live now: the preset feeds, then one videos.list call.
  await expect(page.getByRole('heading', { name: en.live.title, exact: true })).toBeVisible();
  const liveItem = page.locator('.live-now .stream-item').first();
  await expect(liveItem).toContainText('Fake live final');
  await expect(liveItem.locator('.badge-live')).toHaveText(en.live.badge);
  await liveItem.getByRole('button').click();
  await expect(page.locator(`[data-stream="${LIVE}"] .badge-live`)).toBeVisible({ timeout: 15_000 });

  // Search: Ctrl + K, the cost is shown before the call, and the result can be added.
  await page.keyboard.press('Control+k');
  await page.getByLabel(en.search.label).fill('final');
  await expect(page.getByText('Uses 1 of your 100 daily searches (100 left).')).toBeVisible();
  await page.getByRole('button', { name: /Search YouTube for live streams/ }).click();
  await expect(page.getByText('Fake found stream')).toBeVisible();
  expect(fake.calls.filter((c) => c === '/youtube/v3/search')).toHaveLength(1);
  await page.getByRole('button', { name: /Add Fake found stream/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-stream="${FOUND}"]`)).toBeVisible();

  // Settings show the key works and today's count.
  await page.getByRole('button', { name: en.settings.open }).click();
  await expect(page.getByText(en.settings.keyState.valid)).toBeVisible();
  await expect(page.getByText('Searches: 1 of 100')).toBeVisible();
  await app.close();
});

test('tells once when a watched channel goes live, and the notification adds the stream', async () => {
  // The notifications are recorded instead of shown.
  const record = (app: ElectronApplication) =>
    app.evaluate(({ Notification }) => {
      const g = globalThis as unknown as { shown: { title: string; body: string }[]; last: Electron.Notification };
      g.shown = [];
      Notification.prototype.show = function (this: Electron.Notification) {
        g.shown.push({ title: this.title, body: this.body });
        g.last = this;
        this.emit('show');
      };
    });
  const { app, page } = await launch(fake, true, { notify: { on: true, sports: ['swimming'], channels: [] } }, record);
  const shown = () => app.evaluate(() => (globalThis as unknown as { shown: { title: string; body: string }[] }).shown);
  await expect
    .poll(shown, { timeout: 20_000 })
    .toEqual([{ title: en.notify.title.replace('{channel}', 'Fake federation'), body: 'Fake live final' }]);

  // Later checks do not tell again.
  await page.waitForTimeout(5000);
  expect(await shown()).toHaveLength(1);

  await app.evaluate(() => (globalThis as unknown as { last: Electron.Notification }).last.emit('click'));
  await expect(page.locator(`[data-stream="${LIVE}"]`)).toHaveAttribute('data-sport', 'swimming');
  await app.close();
});

test('the coming week lists upcoming streams by day, and keeps a reminder', async () => {
  const { app, page } = await launch(fake, true);
  await page.getByRole('button', { name: en.upcoming.open }).click();
  const dialog = page.getByRole('dialog');
  const item = dialog.locator('.upcoming-item', { hasText: 'Fake semifinal' });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: en.upcoming.remind }).click();
  await expect(item.getByRole('button', { name: en.upcoming.remind })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('.upcoming-reminders')).toContainText('Fake semifinal');
  await page.waitForTimeout(800);
  const dir = (await app.evaluate(({ app: a }) => a.getPath('userData'))) as string;
  const saved = JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  expect(saved.reminders).toEqual([
    expect.objectContaining({ videoId: UPCOMING, at: UPCOMING_AT, title: 'Fake semifinal' }),
  ]);
  await app.close();
});
