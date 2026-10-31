// Records the README's demo GIF from the built app (run `npm run build` first; needs the internet and
// ffmpeg on the PATH, or its path in FFMPEG):
//   node scripts/record-demo.mjs
// The streams are highlights that FISU, the International University Sports Federation, publishes on
// YouTube under CC BY 3.0 (credited in the README), so the GIF shows only footage that may be reused.
// The windows open off the screen and their sound is muted, so a recording neither shows up nor plays
// anything aloud. Moving video makes a GIF large, so the video scenes are short and slow, or single
// frames. Writes docs/assets/demo.gif; --keep leaves the frames in test-data/demo.
/* global document, innerHeight, innerWidth, window -- in functions that run in the app's page */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron } from '@playwright/test';

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
// FISU's highlights, with how many 10-second steps into each the scene shows it.
const SWIMMING = [
  { id: 'wrIu2k9VVQI', skip: 9 },
  { id: 'ZMbYkR2tuG4', skip: 14 },
  { id: 'eYTMSwwG_FQ', skip: 16 },
  { id: 'Ck6B0jdveHo', skip: 16 },
];
const ATHLETICS = [
  { id: 'KukMw2yXcps', skip: 12 },
  { id: 'K_R2P9TzLoA', skip: 18 },
  { id: 'ovSoYO-3ZJw', skip: 15 },
];
const VOLLEYBALL = [
  { id: 'XHsOOcc2Z_c', skip: 12 },
  { id: 'hEWvoI9LkNg', skip: 18 },
  { id: 'eV9nZNiCKDM', skip: 15 },
];
const ALPINE = [
  { id: 'o0D1gh_czcI', skip: 12 },
  { id: 'pk6Q5-huQ_g', skip: 18 },
  { id: 'w17yWzGc4Dw', skip: 15 },
];
const HOCKEY = [
  { id: 'UkLUOt5qhQE', skip: 12 },
  { id: 'Nj0qVvtZuaU', skip: 18 },
  { id: 'z3yTr_SvQJI', skip: 15 },
];
const BASKETBALL = [
  { id: 'L5soYmo_3qU', skip: 12 },
  { id: 'kC1qmMt2EYY', skip: 18 },
  { id: '6wUl8EE1yAA', skip: 15 },
];
const LANGUAGES = ['tr', 'ja', 'ar', 'de', 'es'];
const WIDTH = 1280;
const HEIGHT = 800;
const OUTPUT = 'docs/assets/demo.gif';

const work = path.resolve('test-data', 'demo');
rmSync(work, { recursive: true, force: true, maxRetries: 5 });
mkdirSync(path.join(work, 'frames'), { recursive: true });
// Loaded before the app: every window goes off the screen and out of the taskbar, and all sound is
// muted (the app still shows which stream you hear).
writeFileSync(
  path.join(work, 'hook.cjs'),
  `const { app } = require('electron');
app.on('browser-window-created', (_event, win) => {
  win.setPosition(-${WIDTH + 400}, 40);
  win.setSkipTaskbar(true);
});
app.on('web-contents-created', (_event, contents) => contents.setAudioMuted(true));
`,
);

// Starts the app with its own settings: `sports` are the Live now sports (they pick the start
// screen's theme), and a session opens with its streams and their sports.
let launches = 0;
async function launch({ sports = [], streams = [], layout = '1', scheme = 'light' }) {
  const user = path.join(work, `user-${++launches}`);
  mkdirSync(user, { recursive: true });
  const session = {
    layout,
    streams: streams.map((s) => s.id),
    selected: streams[0]?.id ?? null,
    muted: false,
    masterVolume: 1,
    volumes: {},
    sports: Object.fromEntries(streams.map((s) => [s.id, s.sport])),
  };
  writeFileSync(
    path.join(user, 'settings.json'),
    JSON.stringify({
      clipboardSuggestions: false,
      welcomeSeen: true,
      language: 'en',
      theme: 'auto',
      colorScheme: scheme,
      sports,
      session,
    }),
  );
  const app = await electron.launch({
    // YouTube's player in English, and the window drawn even though it is off the screen.
    args: ['.', '--lang=en-US', '--force-device-scale-factor=1', '--disable-features=CalculateNativeWinOcclusion'],
    colorScheme: null,
    env: {
      ...process.env,
      NODE_OPTIONS: `--require ${JSON.stringify(path.join(work, 'hook.cjs'))}`,
      SPLITWATCH_NO_UPDATES: '1',
      SPLITWATCH_NO_REMOTE_PRESETS: '1',
      // Live now stays empty: the GIF shows no channel's videos but FISU's.
      SPLITWATCH_FEEDS_BASE: 'http://127.0.0.1:9',
      SPLITWATCH_USER_DATA: user,
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.topbar');
  await app.evaluate(
    ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(...size),
    [WIDTH, HEIGHT],
  );
  await page.waitForFunction(([w, h]) => innerWidth === w && innerHeight === h, [WIDTH, HEIGHT]);
  return { app, page };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Each frame is a screenshot and how long the GIF shows it.
const frames = [];
async function shoot(page, ms) {
  const file = path.join(work, 'frames', `${String(frames.length).padStart(5, '0')}.png`);
  writeFileSync(file, await page.screenshot());
  frames.push({ file, ms });
}
// Screenshots at about `fps` a second until the returned function is called; each frame lasts until
// the next one was taken.
function rolling(page, fps) {
  let on = true;
  const done = (async () => {
    while (on) {
      const start = Date.now();
      await shoot(page, 0);
      const rest = 1000 / fps - (Date.now() - start);
      if (rest > 0) await wait(rest);
      frames.at(-1).ms = Date.now() - start;
    }
  })();
  return async () => {
    on = false;
    await done;
  };
}

const playing = (page, id) => page.waitForSelector(`[data-stream="${id}"][data-state="playing"]`, { timeout: 60_000 });
const layout = (page, id) => page.getByRole('button', { name: en.layout[id], exact: true }).click();
// Before a shot: YouTube's captions off (a command its embedded players take by message), and the
// pointer once over the players and away, so their controls hide as they do after a moment.
async function settle(page) {
  await page.evaluate(() => {
    for (const frame of document.querySelectorAll('iframe')) {
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }),
        '*',
      );
    }
  });
  await page.mouse.move(WIDTH / 2, HEIGHT / 2, { steps: 5 });
  await page.mouse.move(60, 12, { steps: 5 });
  await wait(6000);
}

// Plays every stream of the session, each from its point in the highlights.
async function playAll(page, streams) {
  const all = page.getByRole('button', { name: en.playAll.button });
  if (streams.length > 1 && (await all.isVisible())) await all.click();
  await page.locator('.brand').click();
  for (const [index, stream] of streams.entries()) {
    await playing(page, stream.id);
    await page.keyboard.press(String(index + 1));
    for (let i = 0; i < stream.skip; i++) {
      await page.keyboard.press('ArrowRight');
      await wait(350);
    }
  }
  await page.keyboard.press('1');
  // A long jump can leave a player buffering for a while.
  for (const stream of streams) await playing(page, stream.id);
  await settle(page);
}

const sport = (list, name) => list.map((s) => ({ ...s, sport: name }));

// 1. The start screen, in the Track theme of the Live now sport and in a few of the twelve
// languages; a swimming stream added by its link, and its sport set by hand: the Pool theme.
{
  const { app, page } = await launch({ sports: ['athletics'] });
  await wait(1500);
  const stop = rolling(page, 8);
  await wait(1400);
  for (const language of LANGUAGES) {
    await page.evaluate((lng) => window.splitwatch.saveSettings({ language: lng }), language);
    await wait(1000);
  }
  await page.evaluate(() => window.splitwatch.saveSettings({ language: 'en' }));
  await wait(600);
  const box = page.getByLabel(en.add.label);
  await box.click();
  await box.pressSequentially(`https://youtu.be/${SWIMMING[0].id}`, { delay: 45 });
  await box.press('Enter');
  await stop();
  await playing(page, SWIMMING[0].id);
  await page.locator('.brand').click();
  for (let i = 0; i < SWIMMING[0].skip; i++) {
    await page.keyboard.press('ArrowRight');
    await wait(350);
  }
  await settle(page);
  await shoot(page, 1300);
  await page.getByRole('button', { name: en.tile.sportUnknown.replace('{index}', '1') }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await wait(500);
  await shoot(page, 1000);
  await dialog.getByRole('radio', { name: en.sports.swimming, exact: true }).check();
  await wait(500);
  await shoot(page, 900);
  await dialog.locator('.dialog-actions').getByRole('button', { name: en.sport.close }).click();
  await settle(page);
  await shoot(page, 1500);
  await app.close();
}

// 2. Three swimming streams and an empty place, which shows the theme's lane ropes; picking the
// stream you hear; one large with a strip.
{
  const streams = sport(SWIMMING.slice(0, 3), 'swimming');
  const { app, page } = await launch({ streams, layout: '4' });
  await playAll(page, streams);
  const stop = rolling(page, 3);
  await wait(1800);
  await page.keyboard.press('3');
  await wait(1400);
  await stop();
  await layout(page, 'featured');
  await settle(page);
  await shoot(page, 1800);
  await app.close();
}

// 3. Every sport its own theme: three streams of one sport and an empty place with its background.
for (const [streams, scheme] of [
  [sport(ATHLETICS, 'athletics'), 'light'],
  [sport(VOLLEYBALL, 'volleyball'), 'light'],
  [sport(BASKETBALL, 'basketball'), 'dark'],
  [sport(ALPINE, 'alpine-skiing'), 'light'],
  [sport(HOCKEY, 'ice-hockey'), 'dark'],
]) {
  const { app, page } = await launch({ streams, layout: '4', scheme });
  await playAll(page, streams);
  await shoot(page, 1500);
  await app.close();
}

// 4. Mixed sports: the window stays neutral and each stream shows its sport; light, then dark.
{
  const streams = [
    ...sport(SWIMMING.slice(3, 4), 'swimming'),
    ...sport(ATHLETICS.slice(0, 1), 'athletics'),
    ...sport(ALPINE.slice(0, 1), 'alpine-skiing'),
    ...sport(HOCKEY.slice(0, 1), 'ice-hockey'),
  ];
  const { app, page } = await launch({ streams, layout: '4' });
  await playAll(page, streams);
  await shoot(page, 1600);
  await page.getByRole('button', { name: en.scheme.toDark }).click();
  await wait(800);
  await shoot(page, 1600);

  // 5. A closing card, drawn in a window of its own.
  const icon = readFileSync('build/icon.svg', 'base64');
  const card = await app.evaluate(
    async ({ BrowserWindow }, { html, width, height }) => {
      const win = new BrowserWindow({ show: false, width, height, useContentSize: true });
      await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const image = await win.capturePage();
      win.destroy();
      return image.resize({ width, height }).toPNG().toString('base64');
    },
    {
      width: WIDTH,
      height: HEIGHT,
      html: `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0d1b2a;color:#f4f7fb;font-family:"Segoe UI",system-ui,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center}
img{width:120px;height:120px}h1{margin:4px 0 0;font-size:40px;font-weight:600;color:#c9d6e6}
p.slogan{margin:0 0 14px;font-size:62px;font-weight:700;letter-spacing:-1px;line-height:1.1}
p{margin:0;font-size:25px;color:#c9d6e6}p.small{font-size:21px;color:#93a7bf}
</style><img src="data:image/svg+xml;base64,${icon}" alt=""><h1>Splitwatch</h1>
<p class="slogan">Every sport. Every stream.<br>One screen.</p>
<p>12 sport themes · 12 languages</p>
<p class="small">Free and open source · for Windows and macOS</p>`,
    },
  );
  await app.close();
  const cardFile = path.join(work, 'frames', 'card.png');
  writeFileSync(cardFile, Buffer.from(card, 'base64'));
  frames.push({ file: cardFile, ms: 4000 });
}

const list = ['ffconcat version 1.0'];
for (const frame of frames) {
  list.push(`file '${frame.file.replace(/\\/g, '/')}'`, `duration ${(frame.ms / 1000).toFixed(3)}`);
}
// The concat demuxer drops the last frame's duration unless the file is named once more.
list.push(`file '${frames.at(-1).file.replace(/\\/g, '/')}'`);
writeFileSync(path.join(work, 'frames.txt'), `${list.join('\n')}\n`);

mkdirSync(path.dirname(OUTPUT), { recursive: true });
execFileSync(
  process.env.FFMPEG ?? 'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    path.join(work, 'frames.txt'),
    '-vf',
    'scale=960:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    '-fps_mode',
    'vfr',
    '-loop',
    '0',
    OUTPUT,
  ],
  { stdio: 'inherit' },
);
if (!process.argv.includes('--keep')) rmSync(work, { recursive: true, force: true, maxRetries: 5 });
console.log(`${OUTPUT}: ${frames.length} frames, ${(readFileSync(OUTPUT).length / 1e6).toFixed(1)} MB`);
