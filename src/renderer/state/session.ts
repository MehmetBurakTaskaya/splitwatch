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
  info: Record<string, VideoInfo | null>;
  status: Record<string, PlayerStatus>;
  add(videoId: string): AddResult;
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
  info: {},
  status: {},

  add(videoId) {
    const { streams, layout, selected } = get();
    if (streams.includes(videoId)) return 'duplicate';
    if (streams.length >= MAX_STREAMS) return 'full';
    const next = [...streams, videoId];
    set({
      streams: next,
      layout: layoutById(layout).capacity < next.length ? layoutFor(next.length) : layout,
      selected: selected ?? videoId,
    });
    return 'added';
  },

  remove(videoId) {
    const { streams, selected, maximized, volumes, status } = get();
    const index = streams.indexOf(videoId);
    if (index < 0) return;
    const next = streams.filter((id) => id !== videoId);
    set({
      streams: next,
      selected: selected === videoId ? (next[Math.min(index, next.length - 1)] ?? null) : selected,
      maximized: maximized === videoId ? null : maximized,
      volumes: without(volumes, videoId),
      status: without(status, videoId),
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
}));

export function sessionSnapshot(s: Session): Session {
  return {
    layout: s.layout,
    streams: s.streams,
    selected: s.selected,
    muted: s.muted,
    masterVolume: s.masterVolume,
    volumes: s.volumes,
  };
}
