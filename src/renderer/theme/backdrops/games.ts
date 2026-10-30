// The Summer and Winter Games: two scenes of their own (Stadium, Aurora) for the event themes, and two
// frames drawn over a sport's backdrop while an event mode is on, so each sport keeps its picture
// inside the event's light. Original drawings: floodlights and the northern lights, no emblem, torch,
// flame or other mark of the Games.
import { mountains } from './snow';
import {
  type Backdrop,
  type Frame,
  TAU,
  darken,
  glowAt,
  lighten,
  mix,
  random,
  snowfall,
  vertical,
  withAlpha,
} from './kit';

// Snow per density step (Frame.snow: 0 none, 1 light, 2 medium, 3 heavy).
const SNOW = [0, 0.25, 0.55, 1];

// A floodlight: a mast's lamp bank and the cone of light it throws onto the field.
export function floodlight(
  f: Frame,
  x: number,
  y: number,
  angle: number,
  reach: number,
  color: string,
  alpha: number,
): void {
  const ctx = f.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, 0, 0, reach);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.lineTo(reach * 0.32, reach);
  ctx.lineTo(-reach * 0.32, reach);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Light towers on the stand's rim, each with its lamp bank.
function towers(f: Frame, rim: (x: number) => number): { x: number; y: number }[] {
  const ctx = f.ctx;
  const spots = [0.08, 0.3, 0.7, 0.92].map((at) => {
    const x = f.w * at;
    return { x, y: rim(x) - f.h * 0.2 };
  });
  for (const { x, y } of spots) {
    ctx.fillStyle = f.scene.line;
    ctx.fillRect(x - 1.5, y, 3, rim(x) - y + 2);
    ctx.fillStyle = lighten(f.scene.accent2, f.dark ? 0 : 0.2);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x - 13 + c * 7, y - 9 + r * 5, 5, 3);
  }
  return spots;
}

// Summer: a stadium at dusk (light) or at night (dark), its floodlights on, a warm sun low in the sky.
// Scene: base sky, line stands and masts, accent sun, accent2 lamps, glow haze.
export function stadium(): Backdrop {
  let lamps: { x: number; y: number }[] = [];
  return {
    still(f) {
      vertical(f, [
        [0, f.dark ? darken(f.scene.base, 0.2) : f.scene.base],
        [0.62, f.scene.glow],
        [1, f.scene.base],
      ]);
      glowAt(f, f.w * 0.22, f.h * 0.6, Math.max(f.w, f.h) * 0.45, f.scene.accent, f.dark ? 0.18 : 0.35);
      const rim = (x: number) => f.h * 0.7 - Math.sin((x / f.w) * Math.PI) * f.h * 0.06;
      const ctx = f.ctx;
      ctx.fillStyle = f.scene.line;
      ctx.beginPath();
      ctx.moveTo(0, f.h);
      for (let x = 0; x <= f.w; x += 12) ctx.lineTo(x, rim(x));
      ctx.lineTo(f.w, f.h);
      ctx.closePath();
      ctx.fill();
      // Rows of seats as fine lines on the stand.
      if (!f.low) {
        ctx.strokeStyle = withAlpha(f.scene.glow, f.dark ? 0.08 : 0.25);
        ctx.lineWidth = 1;
        for (let row = 1; row < 9; row++) {
          ctx.beginPath();
          for (let x = 0; x <= f.w; x += 12) {
            const y = rim(x) + row * f.h * 0.035;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      lamps = towers(f, rim);
    },
    moving(f) {
      const ctx = f.ctx;
      ctx.globalCompositeOperation = f.dark ? 'lighter' : 'source-over';
      for (const [i, { x, y }] of lamps.entries()) {
        const toward = x < f.w / 2 ? -0.5 : 0.5;
        const sway = Math.sin(f.t * 0.35 + i * 1.7) * 0.06;
        floodlight(f, x, y, toward + sway, f.h * 0.9, f.scene.accent2, f.dark ? 0.16 : 0.22);
      }
    },
  };
}

// The northern lights: ribbons of light that wave slowly across the sky.
export function ribbons(f: Frame, top: number, height: number, alpha: number): void {
  const ctx = f.ctx;
  const bands = [
    { color: f.scene.accent, y: top, amp: 26, speed: 0.22, freq: 0.006, phase: 0 },
    { color: f.scene.accent2, y: top + height * 0.25, amp: 34, speed: 0.15, freq: 0.0045, phase: 2 },
    {
      color: mix(f.scene.accent, f.scene.accent2, 0.5),
      y: top + height * 0.1,
      amp: 20,
      speed: 0.3,
      freq: 0.008,
      phase: 4,
    },
  ];
  ctx.globalCompositeOperation = f.dark ? 'lighter' : 'source-over';
  for (const b of bands) {
    const edge = (x: number) => b.y + Math.sin(x * b.freq + f.t * b.speed + b.phase) * b.amp;
    const g = ctx.createLinearGradient(0, b.y - b.amp, 0, b.y + height);
    g.addColorStop(0, withAlpha(b.color, 0));
    g.addColorStop(0.2, withAlpha(b.color, alpha));
    g.addColorStop(1, withAlpha(b.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, edge(0));
    for (let x = 16; x <= f.w + 16; x += 16) ctx.lineTo(x, edge(x));
    for (let x = f.w + 16; x >= 0; x -= 16)
      ctx.lineTo(x, edge(x) + height * (0.7 + 0.3 * Math.sin(x * 0.01 + f.t * 0.1)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Winter: mountains under the northern lights, with snow. Scene: base sky, line mountains, accent
// and accent2 the lights, glow snow.
export function aurora(): Backdrop {
  const snow = snowfall(170, 47);
  return {
    still(f) {
      vertical(f, [
        [0, f.dark ? darken(f.scene.base, 0.3) : lighten(f.scene.base, 0.3)],
        [1, f.scene.base],
      ]);
      if (f.dark && !f.low) {
        const rnd = random(5);
        f.ctx.fillStyle = withAlpha(f.scene.glow, 0.7);
        for (let i = 0; i < 140; i++) {
          f.ctx.beginPath();
          f.ctx.arc(rnd() * f.w, rnd() * f.h * 0.6, rnd() * 1.1 + 0.2, 0, TAU);
          f.ctx.fill();
        }
      }
      mountains(f, 9, [
        { top: f.h * 0.62, color: mix(f.scene.line, f.scene.base, 0.35), rough: f.h * 0.07 },
        { top: f.h * 0.74, color: f.scene.line, rough: f.h * 0.05 },
      ]);
    },
    moving(f) {
      ribbons(f, f.h * 0.08, f.h * 0.42, f.dark ? 0.32 : 0.28);
      snow(f, f.scene.glow, SNOW[f.snow] ?? 0);
    },
  };
}

// Over a sport's backdrop: the northern lights across the middle of the window, where the grid's
// empty places and gaps show them, and snow (in an icy blue on light backdrops, where white would
// not show).
export function winterFrame(): Backdrop {
  const snow = snowfall(170, 53);
  return {
    still() {},
    moving(f) {
      ribbons(f, f.h * 0.3, f.h * 0.45, f.dark ? 0.24 : 0.2);
      snow(f, f.dark ? f.scene.glow : mix(f.scene.line, f.scene.accent2, 0.35), SNOW[f.snow] ?? 0);
    },
  };
}

// Over a sport's backdrop: a warm evening light rising from the bottom, and two floodlights from the
// top corners.
export function summerFrame(): Backdrop {
  return {
    still(f) {
      vertical(
        f,
        [
          [0, withAlpha(f.scene.accent, 0)],
          [1, withAlpha(f.scene.accent, f.dark ? 0.2 : 0.22)],
        ],
        f.h * 0.5,
        f.h,
      );
    },
    moving(f) {
      f.ctx.globalCompositeOperation = f.dark ? 'lighter' : 'source-over';
      const sway = Math.sin(f.t * 0.3) * 0.05;
      floodlight(f, -10, -10, -0.7 + sway, f.h * 1.4, f.scene.accent2, f.dark ? 0.16 : 0.26);
      floodlight(f, f.w + 10, -10, 0.7 - sway, f.h * 1.4, f.scene.accent2, f.dark ? 0.16 : 0.26);
    },
  };
}
