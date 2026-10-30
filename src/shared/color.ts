// sRGB colors as #rrggbb strings, and WCAG 2 contrast. Pure functions, used by the theme checks,
// the theme engine and scripts/theme-palette.mjs.

export type Rgb = [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

export function parseHex(hex: string): Rgb {
  if (!HEX.test(hex)) throw new Error(`Not a #rrggbb color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16)) as Rgb;
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

// Hue in degrees, saturation and lightness in percent.
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Mixes b into a: t = 0 gives a, t = 1 gives b.
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * t) as Rgb);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
