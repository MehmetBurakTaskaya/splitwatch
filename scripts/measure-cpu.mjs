// Measures the CPU use of the built app (run `npm run build` first) in a few theme situations, as the
// sum over all of its processes in percent of one CPU core, averaged over 20 seconds:
//   node scripts/measure-cpu.mjs
// The grid situations play real YouTube videos (the newest uploads of two preset channels), so they
// need the internet and vary with the videos and the network.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron } from '@playwright/test';

const SECONDS = 20;
const CHANNELS = ['UCNMg6XDhRZI2QzL4pWOvP_w', 'UCXRVKD6l-LrX5TmGJqQFFoQ'];

async function latestVideos(count) {
  const ids = [];
  for (const channel of CHANNELS) {
    const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`)).text();
    ids.push(...[...xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)].map((m) => m[1]));
  }
  return ids.slice(0, count);
}

async function measure(label, settings) {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-cpu-'));
  writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ clipboardSuggestions: false, ...settings }));
  const app = await electron.launch({
    args: ['.'],
    colorScheme: null,
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: dir, SPLITWATCH_NO_REMOTE_PRESETS: '1' },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  await page.waitForTimeout(8000);
  const sample = () =>
    app.evaluate(({ app: a }) => a.getAppMetrics().reduce((sum, p) => sum + p.cpu.percentCPUUsage, 0));
  await sample();
  const values = [];
  for (let i = 0; i < SECONDS / 2; i++) {
    await page.waitForTimeout(2000);
    values.push(await sample());
  }
  const moving = await page.locator('.backdrop').getAttribute('data-moving');
  const playing = await page.locator('[data-state="playing"]').count();
  await app.close();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  console.log(
    `${label.padEnd(52)} ${mean.toFixed(1).padStart(6)} %  (backdrop moving: ${moving}, playing: ${playing})`,
  );
}

const base = { animate: true, performance: false, colorScheme: 'light' };
await measure('Start screen, Neutral (still)', { ...base, theme: 'neutral' });
for (const theme of ['pool', 'track', 'swell', 'slalom']) {
  await measure(`Start screen, ${theme} (30 fps)`, { ...base, theme });
}
await measure('Start screen, swell, performance mode', { ...base, theme: 'swell', performance: true });

const videos = await latestVideos(4);
const session = { layout: '6', streams: videos, selected: videos[0], muted: true };
await measure('4 streams + 2 empty places, Neutral', { ...base, theme: 'neutral', session });
await measure('4 streams + 2 empty places, swell (15 fps)', { ...base, theme: 'swell', session });
await measure('4 streams + 2 empty places, swell, performance mode', {
  ...base,
  theme: 'swell',
  performance: true,
  session,
});
