import type { WatchReport } from '../../shared/watch';
import { streamSport } from '../theme/engine';
import { useAppStore } from './app';
import { usePrefs } from './prefs';
import { useSession } from './session';

const EVERY = 15_000;

// Tells the main process every 15 seconds which streams played on screen, each with its share of the
// time since (see shared/watch.ts). Nothing is counted while the window is hidden or the history off.
export function connectWatch(): void {
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const elapsed = Math.min(60, (now - last) / 1000);
    last = now;
    if (!usePrefs.getState().watchHistory || !useAppStore.getState().shown) return;
    const { streams, status, info, popped } = useSession.getState();
    const playing = streams.flatMap((id) => {
      const known = info[id];
      return known && status[id]?.state === 'playing' && !popped.includes(id) ? [{ id, ...known }] : [];
    });
    if (!playing.length) return;
    const reports: WatchReport[] = playing.map(({ id, title, channel }) => ({
      videoId: id,
      title,
      channel,
      sport: streamSport(id),
      seconds: elapsed / playing.length,
    }));
    window.splitwatch.reportWatch(reports);
  }, EVERY);
}
