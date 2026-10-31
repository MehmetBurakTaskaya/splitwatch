import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';
import { tempDir } from './temp';

// Ready lists against stand-ins for the channel feeds and the YouTube Data API: every preset channel
// lists six videos of its own, and with a key the first two of each are live and the third cannot
// play in an embedded player.
const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const KEY = 'test-key-0123456789abcdef';
const SWIMMING_CHANNEL = 'UCZko_COpTM4_d2kPrxZfzFg';
const PER_CHANNEL = 6;

const videoId = (channelId: string, i: number) => `${channelId.slice(-8)}${String(i).padStart(3, '0')}`;

interface Fake {
  base: string;
  feeds: string[];
  close(): Promise<void>;
}

async function startFake(): Promise<Fake> {
  const feeds: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/feeds/videos.xml') {
      const channel = url.searchParams.get('channel_id') ?? '';
      feeds.push(channel);
      const entries = Array.from(
        { length: PER_CHANNEL },
        (_, i) => ` <entry>
  <yt:videoId>${videoId(channel, i)}</yt:videoId>
  <yt:channelId>${channel}</yt:channelId>
  <title>Fake race ${i + 1}</title>
  <author><name>Fake federation</name></author>
  <published>2026-10-${String(30 - i).padStart(2, '0')}T15:00:00+00:00</published>
 </entry>`,
      ).join('\n');
      res.writeHead(200, { 'content-type': 'application/atom+xml' });
      return res.end(
        `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">\n${entries}\n</feed>`,
      );
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    if (url.pathname === '/youtube/v3/videos' && url.searchParams.get('key') === KEY) {
      const ids = (url.searchParams.get('id') ?? '').split(',');
      return res.end(
        JSON.stringify({
          items: ids.map((id) => {
            const i = Number(id.slice(-3));
            return {
              id,
              snippet: {
                title: `Fake race ${i + 1}`,
                channelTitle: 'Fake federation',
                channelId: SWIMMING_CHANNEL,
                liveBroadcastContent: i < 2 ? 'live' : 'none',
              },
              status: { embeddable: i !== 2 },
            };
          }),
        }),
      );
    }
    res.end(JSON.stringify({ error: { code: 404, errors: [{ reason: 'notFound' }] } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    feeds,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function launch(
  fake: Fake,
  withKey: boolean,
  settings: object = {},
): Promise<{ app: ElectronApplication; page: Page }> {
  const userData = tempDir('splitwatch-ready-');
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, language: 'en', welcomeSeen: true, ...settings }),
  );
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
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  return { app, page };
}

const dialog = (page: Page) => page.getByRole('dialog', { name: en.ready.title });
const sport = (page: Page, name: string) => dialog(page).getByRole('radio', { name, exact: true });
const status = (page: Page) => dialog(page).getByRole('status');

let fake: Fake;
test.beforeEach(async () => {
  fake = await startFake();
});
test.afterEach(async () => {
  await fake.close();
});

test('a ready list fills a whole grid, and changes to the grid leave the list as it was', async () => {
  const { app, page } = await launch(fake, false);
  await page.getByRole('button', { name: en.ready.title }).click();
  await expect(sport(page, en.ready.mix)).toBeChecked();
  await sport(page, en.sports.swimming).check();
  await expect(status(page)).toHaveText(`The ${PER_CHANNEL} newest videos are ready.`);
  await expect(dialog(page).getByText(en.ready.latestNote)).toBeVisible();

  // Live streams cannot be told apart without a key.
  await dialog(page).getByRole('radio', { name: en.ready.kindLive }).check();
  await expect(status(page)).toHaveText(en.ready.needsKey);
  await expect(dialog(page).getByRole('button', { name: /^Open/ })).toBeDisabled();
  await dialog(page).getByRole('radio', { name: en.ready.kindAll }).check();

  await dialog(page)
    .getByRole('button', { name: `Open ${PER_CHANNEL} side by side` })
    .click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '6');
  await expect(page.locator('[data-stream]')).toHaveCount(PER_CHANNEL);
  await expect(page.locator(`[data-stream="${videoId(SWIMMING_CHANNEL, 0)}"]`)).toHaveAttribute('data-slot', '0');

  // Removing a stream leaves its place empty, for a link of your own; the list itself stays whole.
  await page.getByRole('button', { name: 'Remove stream 1' }).click();
  await expect(page.locator('[data-stream]')).toHaveCount(PER_CHANNEL - 1);
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '6');

  await page.getByRole('button', { name: en.layouts.title }).click();
  await page.getByRole('dialog', { name: en.layouts.title }).getByRole('button', { name: en.ready.title }).click();
  await sport(page, en.sports.swimming).check();
  await expect(status(page)).toHaveText(`The ${PER_CHANNEL} newest videos are ready.`);
  await expect(
    dialog(page).getByText(`This takes the place of the ${PER_CHANNEL - 1} streams in the grid.`),
  ).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: `Open ${PER_CHANNEL} instead` })).toBeEnabled();
  await app.close();
});

test('the mix takes one stream from each of nine sports', async () => {
  const { app, page } = await launch(fake, false);
  await page.getByRole('button', { name: en.ready.title }).click();
  await expect(status(page)).toHaveText('The 9 newest videos are ready.');
  await dialog(page).getByRole('button', { name: 'Open 9 side by side' }).click();
  await expect(page.locator('.grid')).toHaveAttribute('data-layout', '9');
  await expect(page.locator('[data-stream]')).toHaveCount(9);
  const channels = await page
    .locator('[data-stream]')
    .evaluateAll((tiles) => tiles.map((t) => (t.getAttribute('data-stream') ?? '').slice(0, 8)));
  expect(new Set(channels).size).toBe(9);
  await app.close();
});

test('with a key: live streams first, none that cannot play, and the theme picks the sport', async () => {
  const { app, page } = await launch(fake, true, { theme: 'pool' });
  // Live now on the start screen follows the Pool theme: only the swimming channel's feed is read.
  await expect.poll(() => fake.feeds.length).toBeGreaterThan(0);
  expect(new Set(fake.feeds)).toEqual(new Set([SWIMMING_CHANNEL]));

  await page.getByRole('button', { name: en.ready.title }).click();
  await expect(sport(page, en.sports.swimming)).toBeChecked();
  // Six videos, one of which cannot play here: four fill a grid, two of them live.
  await expect(status(page)).toHaveText('4 streams ready, 2 live.');
  await dialog(page).getByRole('radio', { name: en.ready.kindLive }).check();
  await expect(status(page)).toHaveText('2 streams ready, 2 live.');
  await dialog(page).getByRole('radio', { name: en.ready.kindVideos }).check();
  await expect(status(page)).toHaveText('3 streams ready, none live.');
  await dialog(page).getByRole('button', { name: 'Open 3 side by side' }).click();
  await expect(page.locator('[data-stream]')).toHaveCount(3);
  await expect(page.locator(`[data-stream="${videoId(SWIMMING_CHANNEL, 2)}"]`)).toHaveCount(0);
  await app.close();
});
