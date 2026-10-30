// Prints interface colors for a new theme that pass the contrast checks, from a hue and a saturation:
//   node scripts/theme-palette.mjs <hue 0-360> <saturation 0-100>
// Paste the output into the theme file's "ui" blocks and adjust by eye; the unit tests check the result.
import { contrast, hslToHex } from '../src/shared/color.ts';

const [hue, sat] = process.argv.slice(2).map(Number);
if (!Number.isFinite(hue) || !Number.isFinite(sat)) {
  console.error('Usage: node scripts/theme-palette.mjs <hue 0-360> <saturation 0-100>');
  process.exit(1);
}

// Walks the lightness from `from` in `step` until `ok` holds.
function search(from, step, ok) {
  for (let l = from; l >= 0 && l <= 100; l += step) if (ok(l)) return l;
  throw new Error('No lightness passes; try a lower saturation.');
}

function light() {
  const bg = hslToHex(hue, 28, 96);
  const surface = hslToHex(hue, 30, 99.4);
  const muted = hslToHex(
    hue,
    14,
    search(48, -0.5, (l) => contrast(hslToHex(hue, 14, l), bg) >= 4.7),
  );
  const accent = hslToHex(
    hue,
    sat,
    search(62, -0.5, (l) => contrast(hslToHex(hue, sat, l), bg) >= 3.2),
  );
  const strong = search(55, -0.5, (l) => contrast(hslToHex(hue, sat, l), '#ffffff') >= 4.8);
  return {
    bg,
    surface,
    text: hslToHex(hue, 35, 11),
    muted,
    border: hslToHex(hue, 18, 86),
    accent,
    accentStrong: hslToHex(hue, sat, strong),
    onAccent: '#ffffff',
    accentSoft: hslToHex(hue, Math.min(sat, 70), 93),
  };
}

function dark() {
  const surface = hslToHex(hue, 24, 10.5);
  const onAccent = hslToHex(hue, 50, 6);
  const muted = hslToHex(
    hue,
    12,
    search(50, 0.5, (l) => contrast(hslToHex(hue, 12, l), surface) >= 4.7),
  );
  const accentL = search(40, 0.5, (l) => contrast(hslToHex(hue, sat, l), surface) >= 4.2);
  const strongL = search(accentL, 0.5, (l) => contrast(hslToHex(hue, sat, l), onAccent) >= 7);
  return {
    bg: hslToHex(hue, 28, 7),
    surface,
    text: hslToHex(hue, 25, 92),
    muted,
    border: hslToHex(hue, 18, 21),
    accent: hslToHex(hue, sat, accentL),
    accentStrong: hslToHex(hue, sat, strongL),
    onAccent,
    accentSoft: hslToHex(hue, sat * 0.55, 17),
  };
}

console.log(JSON.stringify({ light: { ui: light() }, dark: { ui: dark() } }, null, 2));
