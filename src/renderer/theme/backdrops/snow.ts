// Slalom (alpine skiing) and Halfpipe (snowboarding).
import { type Backdrop, type Frame, darken, glowAt, lighten, mix, random, snowfall, vertical, withAlpha } from './kit';

function mountains(f: Frame, seed: number, layers: { top: number; color: string; rough: number }[]): void {
  const rnd = random(seed);
  const ctx = f.ctx;
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, f.h);
    let y = layer.top + rnd() * layer.rough;
    for (let x = 0; x <= f.w + 60; x += 40 + rnd() * 60) {
      y = Math.min(layer.top + layer.rough * 1.6, Math.max(layer.top - layer.rough, y + (rnd() - 0.5) * layer.rough));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(f.w + 60, f.h);
    ctx.closePath();
    ctx.fill();
  }
}

// A slope under mountain ridges, ski tracks and a line of gates, in falling snow.
// Scene: base snow, line tracks, accent red gates, accent2 blue gates, glow sky.
export function slalom(): Backdrop {
  const snow = snowfall(140, 31);
  return {
    still(f) {
      const ctx = f.ctx;
      vertical(f, [
        [0, f.scene.glow],
        [0.5, mix(f.scene.glow, f.scene.base, 0.5)],
        [1, f.scene.base],
      ]);
      const ridge = f.dark ? lighten(f.scene.glow, 0.08) : darken(f.scene.glow, 0.08);
      mountains(f, 3, [
        { top: f.h * 0.22, color: mix(ridge, f.scene.accent2, 0.15), rough: f.h * 0.08 },
        { top: f.h * 0.32, color: mix(ridge, f.scene.base, 0.35), rough: f.h * 0.06 },
        { top: f.h * 0.44, color: f.scene.base, rough: f.h * 0.03 },
      ]);
      const path = (y: number) => f.w * 0.5 + f.w * 0.16 * Math.sin(y * 0.011 + 0.6);
      ctx.strokeStyle = f.scene.line;
      for (const offset of [-26, -18, 14, 22]) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let y = f.h * 0.46; y <= f.h; y += 8) {
          const scale = 0.4 + ((y - f.h * 0.46) / (f.h * 0.54)) * 1.2;
          if (y === f.h * 0.46) ctx.moveTo(path(y) + offset * scale, y);
          else ctx.lineTo(path(y) + offset * scale, y);
        }
        ctx.stroke();
      }
      for (let k = 0; k < 7; k++) {
        const depth = k / 6;
        const y = f.h * 0.5 + depth ** 1.3 * f.h * 0.46;
        const scale = 0.45 + depth * 1.3;
        const x = path(y) + (k % 2 ? 1 : -1) * 70 * scale;
        const color = k % 2 ? f.scene.accent2 : f.scene.accent;
        const width = 34 * scale;
        const height = 46 * scale;
        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, y - height, width, height * 0.45);
        ctx.fillRect(x - width / 2 - 2 * scale, y - height * 1.1, 3 * scale, height * 1.1);
        ctx.fillRect(x + width / 2 - scale, y - height * 1.1, 3 * scale, height * 1.1);
        ctx.fillStyle = withAlpha(darken(f.scene.base, 0.3), 0.25);
        ctx.fillRect(x - width / 2, y, width, 3 * scale);
      }
    },
    moving(f) {
      snow(f, f.dark ? '#ffffff' : withAlpha(darken(f.scene.line, 0.15), 0.8));
    },
  };
}

// A halfpipe seen down its length: cross sections shrinking toward the far end, the coping along
// both lips, floodlight and snow. Scene: base pipe, line sections, accent coping, accent2 sky,
// glow light and snow.
export function halfpipe(): Backdrop {
  const snow = snowfall(120, 41);
  const section = (f: Frame, depth: number) => {
    const vy = f.h * 0.28;
    const scale = 1 / (1 + depth * 0.55);
    const width = f.w * 1.25 * scale;
    const height = f.h * 0.62 * scale;
    const bottom = vy + (f.h * 1.02 - vy) * scale;
    return {
      cx: f.w / 2,
      left: f.w / 2 - width / 2,
      right: f.w / 2 + width / 2,
      bottom,
      top: bottom - height,
      r: height * 0.55,
    };
  };
  const outline = (f: Frame, s: ReturnType<typeof section>) => {
    const ctx = f.ctx;
    ctx.moveTo(s.left, s.top);
    ctx.lineTo(s.left, s.bottom - s.r);
    ctx.quadraticCurveTo(s.left, s.bottom, s.left + s.r, s.bottom);
    ctx.lineTo(s.right - s.r, s.bottom);
    ctx.quadraticCurveTo(s.right, s.bottom, s.right, s.bottom - s.r);
    ctx.lineTo(s.right, s.top);
  };
  return {
    still(f) {
      const ctx = f.ctx;
      vertical(f, [
        [0, f.scene.accent2],
        [0.4, f.scene.base],
        [1, f.scene.base],
      ]);
      const near = section(f, 0);
      ctx.fillStyle = f.dark ? lighten(f.scene.base, 0.05) : darken(f.scene.base, 0.03);
      ctx.beginPath();
      outline(f, near);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = f.scene.line;
      ctx.lineWidth = 1.5;
      for (let k = 0; k <= 14; k++) {
        ctx.beginPath();
        outline(f, section(f, k * 0.8));
        ctx.stroke();
      }
      const far = section(f, 14 * 0.8);
      ctx.strokeStyle = f.scene.accent;
      ctx.lineWidth = 3;
      for (const side of ['left', 'right'] as const) {
        ctx.beginPath();
        ctx.moveTo(near[side], near.top);
        ctx.lineTo(far[side], far.top);
        ctx.stroke();
      }
      ctx.strokeStyle = withAlpha(f.scene.line, 0.8);
      ctx.lineWidth = 1;
      for (const at of [0.25, 0.5, 0.75]) {
        ctx.beginPath();
        ctx.moveTo(near.left + near.r + (near.right - near.left - 2 * near.r) * at, near.bottom);
        ctx.lineTo(far.left + far.r + (far.right - far.left - 2 * far.r) * at, far.bottom);
        ctx.stroke();
      }
    },
    moving(f) {
      if (f.low) return;
      glowAt(
        f,
        f.w * 0.2,
        f.h * 0.05,
        Math.max(f.w, f.h) * 0.4,
        f.scene.glow,
        (f.dark ? 0.1 : 0.4) + 0.04 * Math.sin(f.t * 0.7),
      );
      snow(f, f.dark ? f.scene.glow : withAlpha(darken(f.scene.line, 0.2), 0.8));
    },
  };
}
