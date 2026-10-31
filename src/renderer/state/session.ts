import { create } from 'zustand';
import type { VideoInfo } from '../../shared/ipc';
import { type LayoutId, MAX_STREAMS, layoutById, layoutFor, nextLayout } from '../../shared/layouts';
import { DEFAULT_SETTINGS, type Session } from '../../shared/settings';

export type PlayerState = 'loading' | 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued' | 'error';

export interface PlayerStatus {
  state: PlayerState;
  error?: number;
}

export type AddResult = 'added' | 'duplicate' | 'full';

interface SessionState extends Session {
  maximized: string | null;
  // Streams shown in windows of their own instead of the grid (not kept between runs).
  popped: string[];
  // Streams restored from the last session that have not played yet. YouTube lets one player on a
  // screen start by itself, so the others wait for the user: Play all, or their own play button.
  waiting: string[];
  // How many seconds each stream is held back to line it up with the others (see SyncPanel).
  delays: Record<string, number>;
  info: Record<string, VideoInfo | null>;
  status: Record<string, PlayerStatus>;
  // sport: the stream's sport when it is known at adding time (from Live now or a sport search).
  add(videoId: string, sport?: string): AddResult;
  remove(videoId: string): void;
  move(videoId: string, offset: number): void;
  swap(a: string, b: string): void;
  select(videoId: string, options?: { unmute?: boolean }): void;
  selectIndex(index: number): void;
  toggleMute(): void;
  setMasterVolume(volume: number): void;
  setVolume(videoId: string, volume: number): void;
  setLayout(layout: LayoutId): void;
  cycleLayout(): void;
  setMaximized(videoId: string | null): void;
  setStatus(videoId: string, status: PlayerStatus): void;
  setInfo(videoId: string, info: VideoInfo | null): void;
  // A sport, "none", or null to let the app find it.
  setSport(videoId: string, sport: string | null): void;
  setDelay(videoId: string, seconds: number): void;
  popOut(videoId: string): void;
  popIn(videoId: string): void;
  // Puts another stream in a stream's place (same slot, volume and selection), with its sport.
  replace(videoId: string, next: string, sport?: string): void;
  // Replaces the grid with a saved one. Streams in both keep playing; the new ones start, since
  // the user asked for them.
  open(saved: Pick<Session, 'layout' | 'streams' | 'selected' | 'volumes' | 'sports'>): void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

export const useSession = create<SessionState>((set, get) => ({
  ...DEFAULT_SETTINGS.session,
  maximized: null,
  popped: [],
  waiting: [],
  delays: {},
  info: {},
  status: {},

  add(videoId, sport) {
    const { streams, layout, selected, sports } = get();
    if (streams.includes(videoId)) return 'duplicate';
    if (streams.length >= MAX_STREAMS) return 'full';
    const next = [...streams, videoId];
    set({
      streams: next,
      layout: layoutById(layout).capacity < next.length ? layoutFor(next.length) : layout,
      selected: selected ?? videoId,
      // The new stream starts playing, so it has to be on screen.
      maximized: null,
      ...(sport ? { sports: { ...sports, [videoId]: sport } } : {}),
    });
    return 'added';
  },

  remove(videoId) {
    const { streams, selected, maximized, volumes, status, sports, waiting, popped, delays } = get();
    const index = streams.indexOf(videoId);
    if (index < 0) return;
    const next = streams.filter((id) => id !== videoId);
    set({
      streams: next,
      popped: popped.filter((id) => id !== videoId),
      waiting: waiting.filter((id) => id !== videoId),
      selected: selected === videoId ? (next[Math.min(index, next.length - 1)] ?? null) : selected,
      maximized: maximized === videoId ? null : maximized,
      volumes: without(volumes, videoId),
      status: without(status, videoId),
      sports: without(sports, videoId),
      delays: without(delays, videoId),
    });
  },

  move(videoId, offset) {
    const { streams } = get();
    const from = streams.indexOf(videoId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= streams.length) return;
    const next = [...streams];
    [next[from], next[to]] = [next[to]!, next[from]!];
    set({ streams: next });
  },

  swap(a, b) {
    const { streams } = get();
    const i = streams.indexOf(a);
    const j = streams.indexOf(b);
    if (i < 0 || j < 0 || i === j) return;
    const next = [...streams];
    [next[i], next[j]] = [b, a];
    set({ streams: next });
  },

  select(videoId, options) {
    if (!get().streams.includes(videoId)) return;
    set(options?.unmute ? { selected: videoId, muted: false } : { selected: videoId });
  },

  selectIndex(index) {
    const id = get().streams[index];
    if (id) get().select(id, { unmute: true });
  },

  toggleMute: () => set({ muted: !get().muted }),
  setMasterVolume: (volume) => set({ masterVolume: clamp01(volume) }),
  setVolume: (videoId, volume) => set({ volumes: { ...get().volumes, [videoId]: clamp01(volume) } }),

  setLayout(layout) {
    if (layoutById(layout).capacity >= get().streams.length) set({ layout, maximized: null });
  },

  cycleLayout: () => set({ layout: nextLayout(get().layout, get().streams.length), maximized: null }),

  setMaximized(videoId) {
    set({ maximized: videoId && get().streams.includes(videoId) ? videoId : null });
  },

  setStatus: (videoId, status) => set({ status: { ...get().status, [videoId]: status } }),
  setInfo: (videoId, info) => set({ info: { ...get().info, [videoId]: info } }),

  setSport(videoId, sport) {
    if (!get().streams.includes(videoId)) return;
    set({ sports: sport ? { ...get().sports, [videoId]: sport } : without(get().sports, videoId) });
  },

  setDelay(videoId, seconds) {
    const { delays } = get();
    set({ delays: seconds > 0 ? { ...delays, [videoId]: seconds } : without(delays, videoId) });
  },

  popOut(videoId) {
    const { streams, popped, maximized, delays } = get();
    if (!streams.includes(videoId) || popped.includes(videoId)) return;
    // Its own window starts a new player, at live.
    set({
      popped: [...popped, videoId],
      maximized: maximized === videoId ? null : maximized,
      delays: without(delays, videoId),
    });
  },

  popIn(videoId) {
    set({ popped: get().popped.filter((id) => id !== videoId) });
  },

  replace(videoId, next, sport) {
    const { streams, selected, volumes, sports, status, waiting, delays } = get();
    const index = streams.indexOf(videoId);
    if (index < 0 || streams.includes(next)) return;
    const moved = <T>(record: Record<string, T>, value: T | undefined) => {
      const copy = without(record, videoId);
      if (value !== undefined) copy[next] = value;
      return copy;
    };
    set({
      streams: streams.map((id) => (id === videoId ? next : id)),
      selected: selected === videoId ? next : selected,
      volumes: moved(volumes, volumes[videoId]),
      sports: moved(sports, sport),
      status: without(status, videoId),
      waiting: waiting.filter((id) => id !== videoId),
      delays: without(delays, videoId),
    });
  },

  open(saved) {
    const keep = <T>(record: Record<string, T>) =>
      Object.fromEntries(Object.entries(record).filter(([id]) => saved.streams.includes(id)));
    set({
      layout: saved.layout,
      streams: saved.streams,
      selected: saved.selected ?? saved.streams[0] ?? null,
      volumes: saved.volumes,
      sports: saved.sports,
      maximized: null,
      waiting: [],
      status: keep(get().status),
      delays: keep(get().delays),
    });
  },
}));

export function sessionSnapshot(s: Session): Session {
  return {
    layout: s.layout,
    streams: s.streams,
    selected: s.selected,
    muted: s.muted,
    masterVolume: s.masterVolume,
    volumes: s.volumes,
    sports: s.sports,
  };
}
