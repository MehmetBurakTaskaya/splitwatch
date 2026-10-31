// Renders the app icon (build/icon.svg) and the tray marks (build/tray.svg, build/tray-template.svg)
// to PNG with Electron's own Chromium, and packs the Windows .ico and the macOS .icns from them:
//   node scripts/build-icons.mjs
// Each size is drawn from the vector, not scaled from a large picture, so small sizes stay sharp.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron } from '@playwright/test';

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
// The icns types that hold a PNG, and the pixel size of each.
const ICNS_TYPES = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512],
];

// An Electron app with nothing in it; the drawing happens through app.evaluate.
const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-icons-'));
writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'icons', main: 'main.js' }));
writeFileSync(path.join(dir, 'main.js'), '');
const app = await electron.launch({ args: [dir] });
await app.evaluate(({ app: a }) => a.whenReady());

// One hidden window draws each size of an SVG into a canvas and returns it as PNG.
await app.evaluate(async ({ BrowserWindow }) => {
  const win = new BrowserWindow({ show: false, width: 64, height: 64 });
  await win.loadURL('about:blank');
  globalThis.iconWindow = win;
});

async function render(svgFile, size) {
  const svg = readFileSync(svgFile, 'utf8');
  const base64 = await app.evaluate(
    (_electron, { svg: source, size: px }) => {
      const win = globalThis.iconWindow;
      return win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = ${px};
          canvas.getContext('2d').drawImage(img, 0, 0, ${px}, ${px});
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}';
      })`);
    },
    { svg, size },
  );
  return Buffer.from(base64, 'base64');
}

function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(([size, png], i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(([, png]) => png)]);
}

function icns(entries) {
  const parts = entries.map(([type, png]) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + parts.reduce((sum, p) => sum + p.length, 0), 4);
  return Buffer.concat([head, ...parts]);
}

const pngs = new Map();
for (const size of new Set([...ICO_SIZES, ...ICNS_TYPES.map(([, s]) => s), 512, 1024])) {
  pngs.set(size, await render('build/icon.svg', size));
}
writeFileSync('build/icon.png', pngs.get(1024));
writeFileSync('build/icon.ico', ico(ICO_SIZES.map((s) => [s, pngs.get(s)])));
writeFileSync('build/icon.icns', icns(ICNS_TYPES.map(([type, s]) => [type, pngs.get(s)])));
for (const size of [16, 32]) {
  writeFileSync(`src/main/assets/tray-${size}.png`, await render('build/tray.svg', size));
  writeFileSync(`src/main/assets/tray-template-${size}.png`, await render('build/tray-template.svg', size));
}
await app.close();
rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
console.log('build/icon.png, build/icon.ico, build/icon.icns and the tray marks are written.');
