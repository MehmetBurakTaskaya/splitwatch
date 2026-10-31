// Measures how fast the built app starts (run `npm run build` first) and how much memory it uses with
// 0, 4 and 9 streams playing, as the sum over all of its processes:
//   node scripts/measure-startup.mjs
// Startup is the time from the start of the main process to the top bar on screen, the median of five
// cold starts, next to the same for an empty Electron window, which shows what Splitwatch adds. The
// stream situations play real YouTube videos (the newest uploads of preset channels), so they need the
// internet; most of their memory is YouTube's players.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron } from '@playwright/test';

const CHANNELS = ['UCNMg6XDhRZI2QzL4pWOvP_w', 'UCXRVKD6l-LrX5TmGJqQFFoQ'];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function latestVideos(count) {
  const ids = [];
  for (const channel of CHANNELS) {
    const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`)).text();
    ids.push(...[...xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)].map((m) => m[1]));
  }
  return ids.slice(0, count);
}

// Every folder made here is removed at the end.
const root = mkdtempSync(path.join(tmpdir(), 'splitwatch-start-'));

async function launch(settings) {
  const dir = mkdtempSync(path.join(root, 'user-'));
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ clipboardSuggestions: false, welcomeSeen: true, language: 'en', ...settings }),
  );
  const app = await electron.launch({
    args: ['.'],
    colorScheme: null,
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: dir, SPLITWATCH_NO_REMOTE_PRESETS: '1' },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  return { app, page };
}

// An Electron app that only opens a sandboxed window with one line of text.
function emptyApp() {
  const dir = mkdtempSync(path.join(root, 'empty-'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'empty', main: 'main.js' }));
  writeFileSync(
    path.join(dir, 'main.js'),
    `const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({ webPreferences: { sandbox: true, contextIsolation: true } });
  win.loadURL('data:text/html,<p id="ready">Empty</p>');
});`,
  );
  return dir;
}

const uptime = (app) => app.evaluate(() => Math.round(process.uptime() * 1000));
const memory = (app) =>
  app.evaluate(({ app: a }) => a.getAppMetrics().reduce((sum, p) => sum + p.memory.workingSetSize, 0) / 1024);

const empty = emptyApp();
const bare = [];
const own = [];
for (let i = 0; i < 5; i++) {
  const plain = await electron.launch({ args: [empty] });
  await (await plain.firstWindow()).waitForSelector('#ready');
  bare.push(await uptime(plain));
  await plain.close();
  const { app } = await launch({});
  own.push(await uptime(app));
  await app.close();
}
console.log(`Empty Electron window, median of 5: ${median(bare)} ms (${bare.join(', ')})`);
console.log(`Splitwatch top bar, median of 5:    ${median(own)} ms (${own.join(', ')})`);

const videos = await latestVideos(9);
for (const [label, count, layout] of [
  ['Start screen', 0, '1'],
  ['4 streams playing', 4, '4'],
  ['9 streams playing', 9, '9'],
]) {
  const streams = videos.slice(0, count);
  const { app, page } = await launch({ session: { layout, streams, selected: streams[0] ?? null, muted: true } });
  if (count > 1) await page.getByRole('button', { name: 'Play all' }).click();
  await page.waitForTimeout(count ? 25_000 : 5_000);
  const playing = await page.locator('[data-state="playing"]').count();
  console.log(`${label.padEnd(20)} ${Math.round(await memory(app))} MB (playing: ${playing})`);
  await app.close();
}
rmSync(root, { recursive: true, force: true, maxRetries: 5 });
