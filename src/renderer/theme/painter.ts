import type { Scheme, Theme } from '../../shared/themes';
import { BACKDROP_FACTORIES, type Backdrop, EVENT_FRAMES, type Frame } from './backdrops';

// still: one frame, redrawn only when the theme or the window size changes;
// slow and full: animated at 15 or 30 frames a second while the window is visible.
export type Motion = 'still' | 'slow' | 'full';

export interface PaintOptions {
  theme: Theme;
  scheme: Scheme;
  // Performance mode: low resolution, no textures or particles.
  low: boolean;
  motion: Motion;
  // Cross-fade between themes.
  fade: boolean;
  // An event mode: its theme, whose frame is drawn over a sport's backdrop, and its snow (0-3).
  event: { theme: Theme; snow: number } | null;
}

const FPS: Record<Motion, number> = { still: 0, slow: 15, full: 30 };

// Draws the theme's backdrop on two stacked canvases behind the interface (two, so a new theme can
// fade in over the old one). The still part of a backdrop is drawn once into a cached layer; only
// the moving part is drawn on each frame.
export class Painter {
  private readonly layers: HTMLCanvasElement[];
  private front = 0;
  private readonly cache = document.createElement('canvas');
  private cacheKey = '';
  private backdrop: Backdrop | null = null;
  private overlay: Backdrop | null = null;
  private options: PaintOptions | null = null;
  private raf = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private clock = 0;
  private size = { w: 0, h: 0, dpr: 1 };

  constructor(private readonly host: HTMLElement) {
    this.layers = [0, 1].map(() => {
      const canvas = document.createElement('canvas');
      canvas.className = 'backdrop-layer';
      host.append(canvas);
      return canvas;
    });
    this.layers[1]!.style.opacity = '0';
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const canvas of this.layers) canvas.remove();
  }

  update(next: PaintOptions): void {
    const prev = this.options;
    this.options = next;
    const overlayId = (o: PaintOptions | null) =>
      o?.event && o.event.theme.id !== o.theme.id ? (o.event.theme.event ?? null) : null;
    const themeChanged =
      !prev || prev.theme.id !== next.theme.id || prev.scheme !== next.scheme || overlayId(prev) !== overlayId(next);
    if (!prev || prev.theme.backdrop !== next.theme.backdrop) {
      this.backdrop = BACKDROP_FACTORIES[next.theme.backdrop]();
    }
    if (overlayId(prev) !== overlayId(next)) {
      const kind = overlayId(next);
      this.overlay = kind ? EVENT_FRAMES[kind]() : null;
    }
    if (themeChanged && prev) {
      // With a fade, the old picture stays on its canvas and fades out while the new one fades in
      // on the other canvas.
      const old = this.layers[this.front]!;
      if (next.fade) this.front = 1 - this.front;
      const fresh = this.layers[this.front]!;
      fresh.style.transition = old.style.transition = next.fade ? 'opacity 400ms ease' : 'none';
      old.style.opacity = '0';
      fresh.style.opacity = '1';
    }
    this.host.dataset.backdrop = next.theme.backdrop;
    this.resize();
    this.draw(performance.now());
    this.schedule();
  }

  private readonly onResize = () => {
    this.resize();
    this.draw(performance.now());
  };

  private readonly onVisibility = () => this.schedule();

  private moving(): boolean {
    const o = this.options;
    return (
      !!o &&
      FPS[o.motion] > 0 &&
      !o.low &&
      !!(this.backdrop?.moving || this.overlay?.moving) &&
      document.visibilityState === 'visible'
    );
  }

  private schedule(): void {
    cancelAnimationFrame(this.raf);
    const on = this.moving();
    this.host.dataset.moving = String(on);
    if (!on) return;
    this.clock = performance.now();
    const tick = (now: number) => {
      const fps = FPS[this.options!.motion];
      if (now - this.lastFrame >= 1000 / fps - 2) {
        this.elapsed += Math.min(now - this.clock, 250) / 1000;
        this.clock = now;
        this.draw(now);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private resize(): void {
    const dpr = this.options?.low ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === this.size.w && h === this.size.h && dpr === this.size.dpr) return;
    this.size = { w, h, dpr };
    for (const canvas of [...this.layers, this.cache]) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    this.cacheKey = '';
  }

  // The overlay draws in the event theme's colors.
  private frame(ctx: CanvasRenderingContext2D, overlay = false): Frame {
    const o = this.options!;
    const { w, h, dpr } = this.size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const theme = overlay && o.event ? o.event.theme : o.theme;
    return {
      ctx,
      w,
      h,
      t: this.elapsed,
      scene: theme[o.scheme].scene,
      dark: o.scheme === 'dark',
      low: o.low,
      snow: o.event?.snow ?? 0,
    };
  }

  private draw(now: number): void {
    const o = this.options;
    const backdrop = this.backdrop;
    if (!o || !backdrop || !this.size.w) return;
    this.lastFrame = now;
    const overlay = this.overlay;
    const key = `${o.theme.id}|${o.scheme}|${o.low}|${overlay ? o.event?.theme.id : ''}|${this.size.w}x${this.size.h}@${this.size.dpr}`;
    if (key !== this.cacheKey) {
      const ctx = this.cache.getContext('2d')!;
      ctx.reset();
      backdrop.still(this.frame(ctx));
      if (overlay) {
        ctx.save();
        overlay.still(this.frame(ctx, true));
        ctx.restore();
      }
      this.cacheKey = key;
    }
    const ctx = this.layers[this.front]!.getContext('2d')!;
    ctx.reset();
    ctx.drawImage(this.cache, 0, 0);
    for (const [part, isOverlay] of [
      [backdrop, false],
      [overlay, true],
    ] as const) {
      if (!part?.moving) continue;
      ctx.save();
      part.moving(this.frame(ctx, isOverlay));
      ctx.restore();
    }
  }
}
