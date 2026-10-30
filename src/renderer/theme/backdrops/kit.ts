// Shared pieces for the backdrops: the frame they draw into, a seeded random source and a few
// drawing helpers. Every backdrop is original geometry drawn in code; none copies a logo, mark or
// photo.
import { mix, withAlpha } from '../../../shared/color';
import type { SceneRole } from '../../../shared/themes';

export interface Frame {
  ctx: CanvasRenderingContext2D;
  // Size in CSS pixels; the context is already scaled for the screen.
  w: number;
  h: number;
  // Seconds since the backdrop started.
  t: number;
  scene: Record<SceneRole, string>;
  dark: boolean;
  // Performance mode: skip textures and particles.
  low: boolean;
  // Winter Games snow: 0 none to 3 heavy.
  snow: number;
}

export interface Backdrop {
  // Drawn once per size and palette into a cached layer.
  still(f: Frame): void;
  // Drawn on top of the still layer every frame while the backdrop moves, and once otherwise.
  moving?(f: Frame): void;
}

export { mix, withAlpha };

export const TAU = Math.PI * 2;

// mulberry32: small, fast and repeatable, so a still frame looks the same every time.
export function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lighten = (hex: string, amount: number) => mix(hex, '#ffffff', amount);
export const darken = (hex: string, amount: number) => mix(hex, '#000000', amount);

export function fill(f: Frame, color: string): void {
  f.ctx.fillStyle = color;
  f.ctx.fillRect(0, 0, f.w, f.h);
}

export function vertical(f: Frame, stops: [number, string][], y0 = 0, y1 = f.h): void {
  const g = f.ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  f.ctx.fillStyle = g;
  f.ctx.fillRect(0, y0, f.w, y1 - y0);
}

// Fine specks, as on a running track, sand or a court surface.
export function grain(f: Frame, colors: string[], density: number, seed: number, area = { y0: 0, y1: f.h }): void {
  if (f.low) return;
  const rnd = random(seed);
  const count = Math.round(f.w * (area.y1 - area.y0) * density);
  for (const [i, color] of colors.entries()) {
    f.ctx.fillStyle = color;
    for (let n = i; n < count; n += colors.length) {
      f.ctx.fillRect(rnd() * f.w, area.y0 + rnd() * (area.y1 - area.y0), 1.2, 1.2);
    }
  }
}

// A wide, soft band of light that crosses the frame every `period` seconds.
export function sheen(f: Frame, color: string, alpha: number, period: number): void {
  const span = f.w + f.h;
  const x = ((f.t / period) % 1) * (span + 600) - 300 - f.h;
  const g = f.ctx.createLinearGradient(x, 0, x + f.h + 300, f.h);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.5, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  f.ctx.fillStyle = g;
  f.ctx.fillRect(0, 0, f.w, f.h);
}

export function glowAt(f: Frame, x: number, y: number, radius: number, color: string, alpha: number): void {
  const g = f.ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  f.ctx.fillStyle = g;
  f.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
}

// Falling snow; positions follow from the time alone, so nothing is kept between frames.
// share: the part of the flakes that falls (1 = all).
export function snowfall(count: number, seed: number): (f: Frame, color: string, share?: number) => void {
  const rnd = random(seed);
  const flakes: Flake[] = Array.from({ length: count }, () => ({
    x: rnd(),
    y: rnd(),
    size: 0.8 + rnd() * 2.2,
    speed: 18 + rnd() * 40,
    sway: 6 + rnd() * 18,
  }));
  return (f, color, share = 1) => {
    if (f.low || share <= 0) return;
    f.ctx.fillStyle = color;
    f.ctx.beginPath();
    for (const [i, s] of flakes.slice(0, Math.round(flakes.length * share)).entries()) {
      const y = (s.y * (f.h + 20) + f.t * s.speed * (s.size / 2)) % (f.h + 20);
      const x = (s.x * f.w + Math.sin(f.t * 0.6 + i) * s.sway + f.w) % f.w;
      f.ctx.moveTo(x + s.size, y - 10);
      f.ctx.arc(x, y - 10, s.size, 0, TAU);
    }
    f.ctx.fill();
  };
}

export function line(f: Frame, color: string, width: number, points: [number, number][], close = false): void {
  const ctx = f.ctx;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const [i, [x, y]] of points.entries()) {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}
