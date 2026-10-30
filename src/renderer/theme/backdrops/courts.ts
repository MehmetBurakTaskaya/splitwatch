// Court (volleyball), Beach (beach volleyball), Hardwood (basketball) and Rink (ice hockey).
// Markings follow the sports' public court dimensions, drawn from above or in plain perspective.
import {
  type Backdrop,
  type Frame,
  TAU,
  darken,
  fill,
  glowAt,
  grain,
  lighten,
  random,
  sheen,
  vertical,
  withAlpha,
} from './kit';

// An indoor court from above: free zone, court, attack lines and the shadow of the net.
// Scene: base free zone, line markings, accent court, accent2 net, glow arena light.
export function court(): Backdrop {
  return {
    still(f) {
      const ctx = f.ctx;
      fill(f, f.scene.base);
      const height = f.h * 0.78;
      const length = height * 2;
      const x0 = f.w / 2 - length / 2;
      const y0 = f.h / 2 - height / 2;
      ctx.fillStyle = f.scene.accent;
      ctx.fillRect(x0, y0, length, height);
      grain(f, [withAlpha(lighten(f.scene.accent, 0.3), 0.6), withAlpha(darken(f.scene.accent, 0.2), 0.5)], 0.003, 9, {
        y0,
        y1: y0 + height,
      });
      ctx.fillStyle = withAlpha(f.scene.accent2, f.dark ? 0.5 : 0.18);
      ctx.fillRect(f.w / 2 + 6, y0 - 40, 22, height + 80);
      ctx.strokeStyle = f.scene.line;
      ctx.lineWidth = 5;
      ctx.strokeRect(x0, y0, length, height);
      for (const x of [f.w / 2, f.w / 2 - length / 6, f.w / 2 + length / 6]) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + height);
        ctx.stroke();
      }
      ctx.fillStyle = f.scene.accent2;
      for (const y of [y0 - 34, y0 + height + 34]) {
        ctx.beginPath();
        ctx.arc(f.w / 2, y, 7, 0, TAU);
        ctx.fill();
      }
    },
    moving(f) {
      if (f.low) return;
      const x = f.w / 2 + Math.cos(f.t * 0.15) * f.w * 0.3;
      const y = f.h / 2 + Math.sin(f.t * 0.22) * f.h * 0.2;
      glowAt(f, x, y, Math.max(f.w, f.h) * 0.35, f.scene.glow, f.dark ? 0.12 : 0.3);
    },
  };
}

// A beach at sunset: sky, sun, sea, and the ropes of a court on the sand in perspective.
// Scene: base sand, line sea and ropes, accent sunset, accent2 upper sky, glow sun.
export function beach(): Backdrop {
  const shape = (f: Frame) => ({ horizon: f.h * 0.42, sea: f.h * 0.48 });
  return {
    still(f) {
      const ctx = f.ctx;
      const { horizon, sea } = shape(f);
      vertical(
        f,
        [
          [0, f.scene.accent2],
          [1, f.scene.accent],
        ],
        0,
        horizon,
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, f.w, horizon);
      ctx.clip();
      ctx.fillStyle = f.scene.glow;
      ctx.beginPath();
      ctx.arc(f.w * 0.72, horizon - Math.min(f.w, f.h) * 0.03, Math.min(f.w, f.h) * 0.09, 0, TAU);
      ctx.fill();
      ctx.restore();
      vertical(
        f,
        [
          [0, darken(f.scene.line, f.dark ? 0.3 : 0)],
          [1, lighten(f.scene.line, 0.35)],
        ],
        horizon,
        sea,
      );
      vertical(
        f,
        [
          [0, lighten(f.scene.base, f.dark ? 0.06 : 0.12)],
          [1, f.scene.base],
        ],
        sea,
        f.h,
      );
      grain(f, [darken(f.scene.base, 0.12), lighten(f.scene.base, 0.18)], 0.006, 4, { y0: sea, y1: f.h });
      const far = sea + 28;
      const near = f.h * 1.05;
      const corners: [number, number][] = [
        [f.w * 0.3, far],
        [f.w * 0.7, far],
        [f.w * 1.12, near],
        [-f.w * 0.12, near],
      ];
      ctx.strokeStyle = f.scene.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [x, y] of corners) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.stroke();
      // The net stands a little nearer than halfway, as perspective puts the middle of the court.
      const mid = far + (near - far) * 0.38;
      const left = f.w * 0.3 - 0.38 * f.w * 0.42;
      ctx.beginPath();
      ctx.moveTo(left, mid);
      ctx.lineTo(f.w - left, mid);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(darken(f.scene.line, 0.4), 0.7);
      ctx.lineWidth = 2;
      for (const x of [left - 20, f.w - left + 20]) {
        ctx.beginPath();
        ctx.moveTo(x, mid);
        ctx.lineTo(x, mid - f.h * 0.16);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(left - 20, mid - f.h * 0.16);
      ctx.lineTo(f.w - left + 20, mid - f.h * 0.16);
      ctx.stroke();
    },
    moving(f) {
      if (f.low) return;
      const { horizon, sea } = shape(f);
      const ctx = f.ctx;
      ctx.fillStyle = withAlpha(f.scene.glow, 0.55);
      const rnd = random(21);
      for (let i = 0; i < 40; i++) {
        const y = horizon + 4 + rnd() * (sea - horizon - 8);
        const speed = 6 + rnd() * 10;
        const x = (rnd() * f.w + f.t * speed) % f.w;
        ctx.fillRect(x, y, 10 + rnd() * 24, 1.5);
      }
      glowAt(f, f.w * 0.72, horizon, Math.min(f.w, f.h) * 0.3, f.scene.glow, 0.18 + 0.06 * Math.sin(f.t * 0.5));
    },
  };
}

// A basketball floor from above: maple strips and the markings of a full court, scaled so the
// court's width fits the window. Scene: base wood, line markings, accent painted areas,
// accent2 strip seams, glow light.
export function hardwood(): Backdrop {
  return {
    still(f) {
      const ctx = f.ctx;
      fill(f, f.scene.base);
      const rnd = random(13);
      const strip = 18;
      for (let y = 0; y < f.h; y += strip) {
        for (let x = -rnd() * 300; x < f.w;) {
          const length = 160 + rnd() * 260;
          if (!f.low) {
            ctx.fillStyle = rnd() > 0.5 ? withAlpha('#ffffff', rnd() * 0.08) : withAlpha('#000000', rnd() * 0.06);
            ctx.fillRect(x, y, length, strip);
          }
          ctx.fillStyle = withAlpha(f.scene.accent2, 0.6);
          ctx.fillRect(x, y, 1, strip);
          x += length;
        }
        ctx.fillStyle = withAlpha(f.scene.accent2, 0.5);
        ctx.fillRect(0, y, f.w, 1);
      }
      // FIBA court, 28 x 15 m, in metres scaled by s.
      const s = f.h / 16.5;
      const cx = f.w / 2;
      const cy = f.h / 2;
      const half = 14 * s;
      ctx.strokeStyle = f.scene.line;
      ctx.lineWidth = 4;
      ctx.strokeRect(cx - half, cy - 7.5 * s, 2 * half, 15 * s);
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7.5 * s);
      ctx.lineTo(cx, cy + 7.5 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8 * s, 0, TAU);
      ctx.stroke();
      for (const side of [-1, 1]) {
        const base = cx + side * half;
        const ft = base - side * 5.8 * s;
        ctx.fillStyle = withAlpha(f.scene.accent, f.dark ? 0.75 : 0.55);
        ctx.fillRect(Math.min(base, ft), cy - 2.45 * s, 5.8 * s, 4.9 * s);
        ctx.strokeRect(Math.min(base, ft), cy - 2.45 * s, 5.8 * s, 4.9 * s);
        ctx.beginPath();
        ctx.arc(ft, cy, 1.8 * s, 0, TAU);
        ctx.stroke();
        const hoop = base - side * 1.575 * s;
        const corner = Math.asin(6.6 / 6.75);
        ctx.beginPath();
        if (side < 0) ctx.arc(hoop, cy, 6.75 * s, -corner, corner);
        else ctx.arc(hoop, cy, 6.75 * s, Math.PI - corner, Math.PI + corner);
        ctx.stroke();
        for (const dy of [-6.6, 6.6]) {
          ctx.beginPath();
          ctx.moveTo(base, cy + dy * s);
          ctx.lineTo(hoop + side * -Math.cos(corner) * 6.75 * s, cy + dy * s);
          ctx.stroke();
        }
      }
    },
    moving(f) {
      if (f.low) return;
      sheen(f, f.scene.glow, f.dark ? 0.05 : 0.1, 16);
    },
  };
}

// Center ice from above: the red center line, the blue lines, circles and spots, and skate marks.
// Scene: base ice, line red markings, accent blue markings, accent2 skate marks, glow sheen.
export function rink(): Backdrop {
  return {
    still(f) {
      const ctx = f.ctx;
      fill(f, f.scene.base);
      glowAt(f, f.w / 2, f.h / 2, Math.max(f.w, f.h) * 0.7, f.scene.glow, f.dark ? 0.08 : 0.6);
      if (!f.low) {
        const rnd = random(17);
        ctx.strokeStyle = withAlpha(f.scene.accent2, f.dark ? 0.9 : 0.8);
        ctx.lineWidth = 1;
        for (let i = 0; i < 140; i++) {
          const a = rnd() * TAU;
          ctx.beginPath();
          ctx.arc(rnd() * f.w, rnd() * f.h, 80 + rnd() * 320, a, a + 0.2 + rnd() * 0.6);
          ctx.stroke();
        }
      }
      // IIHF rink, 60 x 26 m, in metres scaled by s.
      const s = f.h / 26;
      const cx = f.w / 2;
      const cy = f.h / 2;
      ctx.fillStyle = f.scene.line;
      ctx.fillRect(cx - 0.15 * s, 0, 0.3 * s, f.h);
      ctx.fillStyle = f.scene.accent;
      for (const x of [cx - 8.85 * s, cx + 8.85 * s]) ctx.fillRect(x - 0.15 * s, 0, 0.3 * s, f.h);
      ctx.strokeStyle = f.scene.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5 * s, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = f.scene.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 0.15 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = f.scene.line;
      ctx.strokeStyle = f.scene.line;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + sx * 7.35 * s, cy + sy * 7 * s, 0.3 * s, 0, TAU);
          ctx.fill();
          const ex = cx + sx * 20 * s;
          const ey = cy + sy * 7 * s;
          ctx.beginPath();
          ctx.arc(ex, ey, 4.5 * s, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 0.3 * s, 0, TAU);
          ctx.fill();
        }
      }
    },
    moving(f) {
      if (f.low) return;
      sheen(f, f.scene.glow, f.dark ? 0.06 : 0.35, 20);
    },
  };
}
