// Track (athletics), Transition (triathlon), Peloton (road cycling) and Singletrack (mountain biking).
import { type Backdrop, type Frame, TAU, darken, fill, glowAt, grain, lighten, random, withAlpha } from './kit';

// The bend of a running track: lanes around the infield, staggered start marks and a pace light
// running along lane four. Scene: base track surface, line lane lines, accent darker surface,
// accent2 infield, glow pace light.
export function track(): Backdrop {
  const geometry = (f: Frame) => {
    const lane = Math.min(64, Math.max(36, Math.min(f.w, f.h) / 12));
    return { cx: -0.1 * f.w, cy: 1.15 * f.h, r0: 0.55 * Math.max(f.w, f.h), lane };
  };
  return {
    still(f) {
      const { cx, cy, r0, lane } = geometry(f);
      const ctx = f.ctx;
      fill(f, f.scene.base);
      grain(f, [lighten(f.scene.base, 0.12), darken(f.scene.base, 0.14)], 0.004, 3);
      ctx.fillStyle = f.scene.accent2;
      ctx.beginPath();
      ctx.arc(cx, cy, r0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = f.scene.line;
      for (let k = 0; k <= 8; k++) {
        ctx.lineWidth = k === 0 ? 4 : 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r0 + k * lane, -Math.PI / 2 - 0.2, 0.2);
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      for (let k = 0; k < 8; k++) {
        const a = -1.05 + k * 0.035;
        ctx.beginPath();
        ctx.moveTo(cx + (r0 + k * lane) * Math.cos(a), cy + (r0 + k * lane) * Math.sin(a));
        ctx.lineTo(cx + (r0 + (k + 1) * lane) * Math.cos(a), cy + (r0 + (k + 1) * lane) * Math.sin(a));
        ctx.stroke();
      }
    },
    moving(f) {
      if (f.low) return;
      const { cx, cy, r0, lane } = geometry(f);
      const a = -1.45 + ((f.t * 0.05) % 1) * 1.5;
      const r = r0 + 3.5 * lane;
      glowAt(f, cx + r * Math.cos(a), cy + r * Math.sin(a), lane * 2.5, f.scene.glow, 0.45);
    },
  };
}

// Water, road and run as three bands across the frame, with waves, a dashed center line and
// arrows moving through them. Scene: base, line markings, accent water, accent2 road, glow run.
export function transition(): Backdrop {
  // Local frame: x along the bands, y across them, centered on the window.
  const enter = (f: Frame) => {
    const d = Math.hypot(f.w, f.h);
    f.ctx.save();
    f.ctx.translate(f.w / 2, f.h / 2);
    f.ctx.rotate(Math.atan2(-f.w, f.h));
    return d;
  };
  return {
    still(f) {
      fill(f, f.scene.base);
      const d = enter(f);
      const ctx = f.ctx;
      const g = ctx.createLinearGradient(0, -d / 2, 0, d / 2);
      const a = f.dark ? 0.55 : 0.32;
      g.addColorStop(0, withAlpha(f.scene.accent, a));
      g.addColorStop(0.3, withAlpha(f.scene.accent, a));
      g.addColorStop(0.36, withAlpha(f.scene.accent2, a));
      g.addColorStop(0.64, withAlpha(f.scene.accent2, a));
      g.addColorStop(0.7, withAlpha(f.scene.glow, a));
      g.addColorStop(1, withAlpha(f.scene.glow, a));
      ctx.fillStyle = g;
      ctx.fillRect(-d / 2, -d / 2, d, d);
      ctx.fillStyle = withAlpha(f.scene.line, 0.7);
      for (const y of [-d / 6 + 14, d / 6 - 14, d / 3 - 40, d / 3 + 40]) ctx.fillRect(-d / 2, y - 1.5, d, 3);
      ctx.restore();
    },
    moving(f) {
      const d = enter(f);
      const ctx = f.ctx;
      ctx.strokeStyle = withAlpha(f.scene.line, 0.8);
      ctx.lineWidth = 3;
      ctx.setLineDash([26, 18]);
      ctx.lineDashOffset = -f.t * 40;
      ctx.beginPath();
      ctx.moveTo(-d / 2, 0);
      ctx.lineTo(d / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = withAlpha(f.scene.line, 0.55);
      for (let k = -2; k <= 2; k++) {
        const y0 = -d / 3 + k * 30;
        ctx.beginPath();
        for (let x = -d / 2; x <= d / 2; x += 16) {
          const y = y0 + 5 * Math.sin(x * 0.03 + f.t * 1.2 + k);
          if (x === -d / 2) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = withAlpha(f.scene.line, 0.75);
      const shift = (f.t * 30) % 120;
      ctx.beginPath();
      for (let x = -d / 2 + shift; x < d / 2; x += 120) {
        ctx.moveTo(x - 8, d / 3 - 9);
        ctx.lineTo(x, d / 3);
        ctx.lineTo(x - 8, d / 3 + 9);
      }
      ctx.stroke();
      ctx.restore();
    },
  };
}

// Stage profiles: ridge lines one behind the other, the route in front, drifting slowly sideways.
// Scene: base, line ridges, accent route, accent2 ground, glow unused.
export function ridges(): Backdrop {
  const rnd = random(7);
  const rows = Array.from({ length: 9 }, () =>
    Array.from({ length: 4 }, () => ({ at: rnd(), height: 0.4 + rnd() * 1.2, width: 0.03 + rnd() * 0.08 })),
  );
  return {
    still(f) {
      fill(f, f.scene.base);
    },
    moving(f) {
      const ctx = f.ctx;
      const gap = f.h / (rows.length + 2);
      const period = f.w * 1.5;
      const shift = f.low ? 0 : f.t * 10;
      for (const [i, peaks] of rows.entries()) {
        const base = (i + 2) * gap;
        const y = (x: number) => {
          let v = 0;
          for (const p of peaks) {
            let dx = ((((x + shift * (0.5 + i / 9)) / period - p.at) % 1) + 1) % 1;
            if (dx > 0.5) dx -= 1;
            v += p.height * Math.exp(-((dx / p.width) ** 2));
          }
          return base - Math.min(v, 1.7) * gap;
        };
        ctx.beginPath();
        ctx.moveTo(-4, f.h);
        for (let x = -4; x <= f.w + 4; x += 6) ctx.lineTo(x, y(x));
        ctx.lineTo(f.w + 4, f.h);
        ctx.closePath();
        ctx.fillStyle = i === rows.length - 1 ? f.scene.accent2 : f.scene.base;
        ctx.fill();
        const route = i === rows.length - 3;
        ctx.strokeStyle = route ? f.scene.accent : withAlpha(f.scene.line, 0.45);
        ctx.lineWidth = route ? 3 : 1.5;
        ctx.beginPath();
        for (let x = -4; x <= f.w + 4; x += 6) {
          if (x === -4) ctx.moveTo(x, y(x));
          else ctx.lineTo(x, y(x));
        }
        ctx.stroke();
        if (route) {
          ctx.fillStyle = withAlpha(f.scene.line, 0.5);
          for (let x = 40 - (shift % 80); x < f.w; x += 80) ctx.fillRect(x, y(x) + 6, 1.5, 8);
        }
      }
    },
  };
}

// A topographic map: contour lines of seeded hills, every fifth one stronger, and a dashed trail
// winding through. Scene: base paper, line contours, accent trail, accent2 unused, glow unused.
export function contours(): Backdrop {
  const rnd = random(5);
  const hills = Array.from({ length: 7 }, () => ({
    x: rnd(),
    y: rnd(),
    r: 0.12 + rnd() * 0.25,
    h: (rnd() > 0.25 ? 1 : -0.6) * (0.5 + rnd()),
  }));
  const trail = Array.from({ length: 7 }, (_, i) => [i / 6, 0.2 + rnd() * 0.6] as const);
  const height = (f: Frame, x: number, y: number) => {
    const s = Math.max(f.w, f.h);
    let v = 0.15 * Math.sin(x * 0.004) * Math.cos(y * 0.005);
    for (const hill of hills) {
      const dx = x - hill.x * f.w;
      const dy = y - hill.y * f.h;
      v += hill.h * Math.exp(-(dx * dx + dy * dy) / (hill.r * s) ** 2);
    }
    return v;
  };
  return {
    still(f) {
      fill(f, f.scene.base);
      const cell = f.low ? 16 : 10;
      const cols = Math.ceil(f.w / cell) + 1;
      const rowsN = Math.ceil(f.h / cell) + 1;
      const v: number[] = [];
      let min = Infinity;
      let max = -Infinity;
      for (let r = 0; r < rowsN; r++) {
        for (let c = 0; c < cols; c++) {
          const value = height(f, c * cell, r * cell);
          v.push(value);
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
      const levels = 18;
      const strong = f.dark ? lighten(f.scene.line, 0.2) : darken(f.scene.line, 0.18);
      const ctx = f.ctx;
      for (let l = 1; l < levels; l++) {
        const iso = min + ((max - min) * l) / levels;
        ctx.strokeStyle = l % 5 === 0 ? strong : f.scene.line;
        ctx.lineWidth = l % 5 === 0 ? 2 : 1;
        ctx.beginPath();
        for (let r = 0; r < rowsN - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const a = v[r * cols + c]!;
            const b = v[r * cols + c + 1]!;
            const d = v[(r + 1) * cols + c]!;
            const e = v[(r + 1) * cols + c + 1]!;
            const pts: [number, number][] = [];
            const x = c * cell;
            const y = r * cell;
            if (a < iso !== b < iso) pts.push([x + ((iso - a) / (b - a)) * cell, y]);
            if (b < iso !== e < iso) pts.push([x + cell, y + ((iso - b) / (e - b)) * cell]);
            if (d < iso !== e < iso) pts.push([x + ((iso - d) / (e - d)) * cell, y + cell]);
            if (a < iso !== d < iso) pts.push([x, y + ((iso - a) / (d - a)) * cell]);
            for (let p = 0; p + 1 < pts.length; p += 2) {
              ctx.moveTo(pts[p]![0], pts[p]![1]);
              ctx.lineTo(pts[p + 1]![0], pts[p + 1]![1]);
            }
          }
        }
        ctx.stroke();
      }
    },
    moving(f) {
      const ctx = f.ctx;
      ctx.strokeStyle = f.scene.accent;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = f.low ? 0 : -f.t * 18;
      ctx.beginPath();
      const pts = trail.map(([x, y]) => [x * (f.w + 80) - 40, y * f.h] as const);
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1]!;
        const [x, y] = pts[i]!;
        ctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    },
  };
}
