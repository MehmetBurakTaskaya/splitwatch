import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { eventName } from '../event/names';
import { useEvents } from '../state/events';
import type { Frame } from '../theme/backdrops';
import { floodlight, ribbons } from '../theme/backdrops/games';
import { eventTheme, useTheme } from '../theme/engine';

const LENGTH = 3400;
const SHORT = 1600;

// The opening animation, played the first time an event mode is turned on: light beams rising
// (Summer) or the northern lights unfolding (Winter), then the event's name. The grid is hidden and
// its players paused meanwhile, so nothing is drawn over a player. A click or any key skips it.
export function Intro() {
  const { t } = useTranslation();
  const id = useEvents((s) => s.intro);
  const event = useEvents((s) => s.events.find((e) => e.id === s.intro));
  const scheme = useTheme((s) => s.scheme);
  const reduced = useTheme((s) => s.reducedMotion);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!id) return;
    const done = () => useEvents.setState({ intro: null });
    const timer = setTimeout(done, reduced ? SHORT : LENGTH);
    window.addEventListener('keydown', done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', done);
    };
  }, [id, reduced]);

  useEffect(() => {
    const el = canvas.current;
    const theme = event && eventTheme(event.kind);
    if (!el || !event || !theme) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    el.width = w * dpr;
    el.height = h * dpr;
    const ctx = el.getContext('2d')!;
    const scene = theme[scheme].scene;
    const started = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const s = reduced ? 1.2 : (now - started) / 1000;
      ctx.reset();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = scene.base;
      ctx.fillRect(0, 0, w, h);
      const f: Frame = { ctx, w, h, t: s, scene, dark: scheme === 'dark', low: false, snow: 1 };
      const grow = Math.min(1, s / 1.4);
      const ease = 1 - (1 - grow) ** 3;
      if (event.kind === 'summer') {
        ctx.globalCompositeOperation = f.dark ? 'lighter' : 'source-over';
        for (let i = 0; i < 9; i++) {
          const spread = (i - 4) * 0.24 * ease;
          const color = i % 2 ? scene.accent : scene.accent2;
          floodlight(f, w / 2, h + 20, Math.PI + spread, h * 1.25 * ease, color, 0.22);
        }
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * ease, h);
        ctx.clip();
        ribbons(f, h * 0.18, h * 0.5, f.dark ? 0.45 : 0.35);
        ctx.restore();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [event, scheme, reduced]);

  if (!id || !event) return null;
  return (
    <div
      className={reduced ? 'intro is-reduced' : 'intro'}
      data-event-kind={event.kind}
      onClick={() => useEvents.setState({ intro: null })}
    >
      <canvas ref={canvas} aria-hidden="true" />
      <div className="intro-text" role="status">
        <p className="intro-name">{eventName(t, event)}</p>
        <p className="intro-place">{`${event.place} ${event.year}`}</p>
      </div>
      <button type="button" className="button button-quiet intro-skip">
        {t('event.skip')}
      </button>
    </div>
  );
}
