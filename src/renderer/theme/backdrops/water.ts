// Pool (swimming) and Swell (surfing).
import { type Backdrop, type Frame, TAU, darken, lighten, mix, random, vertical, withAlpha } from './kit';

// Seen from above: lane ropes, the dark lines on the pool floor, and moving light on the water.
// Scene: base water, line light floats, accent end floats, accent2 middle floats, glow light.
export function pool(): Backdrop {
  const laneHeight = (f: Frame) => Math.min(120, Math.max(64, f.h / 7));
  return {
    still(f) {
      vertical(f, [
        [0, lighten(f.scene.base, f.dark ? 0.04 : 0.2)],
        [1, darken(f.scene.base, f.dark ? 0.2 : 0.06)],
      ]);
      const lane = laneHeight(f);
      const ctx = f.ctx;
      const floor = withAlpha(darken(f.scene.base, f.dark ? 0.5 : 0.35), f.dark ? 0.5 : 0.35);
      for (let y = lane / 2; y < f.h + lane; y += lane) {
        ctx.fillStyle = floor;
        ctx.fillRect(48, y - 4, f.w - 96, 8);
        ctx.fillRect(40, y - 20, 8, 40);
        ctx.fillRect(f.w - 48, y - 20, 8, 40);
      }
      const end = f.w * 0.12;
      for (let y = 0; y < f.h + lane; y += lane) {
        for (let x = 0, n = 0; x < f.w; x += 16, n++) {
          const edge = x < end || x > f.w - end;
          ctx.fillStyle = edge ? f.scene.accent : Math.floor(n / 6) % 2 ? f.scene.line : f.scene.accent2;
          ctx.beginPath();
          ctx.roundRect(x + 1, y - 3, 14, 6, 3);
          ctx.fill();
        }
      }
    },
    moving(f) {
      if (f.low) return;
      const ctx = f.ctx;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const y0 = ((i + 0.5) * f.h) / 12;
        ctx.strokeStyle = withAlpha(f.scene.glow, f.dark ? 0.12 : 0.22);
        ctx.lineWidth = 3 + 2 * Math.sin(i * 1.3);
        ctx.beginPath();
        for (let x = -20; x <= f.w + 20; x += 24) {
          const y = y0 + 10 * Math.sin(x * 0.012 + f.t * 0.6 + i * 1.7) + 6 * Math.sin(x * 0.027 - f.t * 0.9 + i);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
  };
}

// Rows of waves rolling toward the viewer, paler toward the horizon.
// Scene: base sky, line foam, accent far water, accent2 near water, glow sky light.
export function swell(): Backdrop {
  const rnd = random(11);
  const layers = Array.from({ length: 7 }, (_, i) => ({ depth: i / 6, phase: rnd() * TAU }));
  return {
    still(f) {
      vertical(f, [
        [0, f.scene.glow],
        [0.3, f.scene.base],
        [1, f.scene.accent2],
      ]);
    },
    moving(f) {
      const ctx = f.ctx;
      for (const { depth, phase } of layers) {
        const baseY = f.h * (0.3 + 0.42 * depth);
        const amp = 8 + 16 * depth;
        const length = 240 + 260 * depth;
        const speed = 14 + 30 * depth;
        const wave = (x: number) =>
          baseY +
          amp * Math.sin(((x + f.t * speed) / length) * TAU + phase) +
          amp * 0.35 * Math.sin(((x - f.t * speed * 0.6) / (length * 0.47)) * TAU + phase * 2);
        ctx.beginPath();
        ctx.moveTo(-10, f.h);
        for (let x = -10; x <= f.w + 10; x += 12) ctx.lineTo(x, wave(x));
        ctx.lineTo(f.w + 10, f.h);
        ctx.closePath();
        ctx.fillStyle = mix(f.scene.accent, f.scene.accent2, depth);
        ctx.fill();
        ctx.strokeStyle = withAlpha(f.scene.line, f.dark ? 0.35 : 0.7);
        ctx.lineWidth = 1.5 + depth;
        ctx.beginPath();
        for (let x = -10; x <= f.w + 10; x += 12) {
          if (x === -10) ctx.moveTo(x, wave(x));
          else ctx.lineTo(x, wave(x));
        }
        ctx.stroke();
      }
    },
  };
}
