import { useAppStore } from '../state/app';
import { useEvents } from '../state/events';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { type Held, clampDelay, holdOf, resumeTime } from './live';

// The live YouTube players, by video ID. Sound is set here from the session: only the picked
// stream is audible (unless everything is muted); the others play muted.
const players = new Map<string, YT.Player>();
// Players paused here because they left the screen, with where they stopped, to be resumed when they
// are back.
const held = new Map<string, Held>();

const PLAYING = 1;
const BUFFERING = 3;

export function registerPlayer(videoId: string, player: YT.Player): void {
  players.set(videoId, player);
  applyAudio();
  syncPlayback();
}

export function unregisterPlayer(videoId: string): void {
  players.delete(videoId);
  held.delete(videoId);
}

export function applyAudio(): void {
  const { muted, selected, masterVolume, volumes } = useSession.getState();
  // A popped-out stream's window can own the sound; the grid is silent meanwhile.
  const gridOwns = useAppStore.getState().audioOwner === 'grid';
  for (const [id, player] of players) {
    try {
      if (gridOwns && !muted && selected === id) {
        player.setVolume(Math.round((volumes[id] ?? 1) * masterVolume * 100));
        player.unMute();
      } else {
        player.mute();
      }
    } catch {
      // A player that is being destroyed can throw; it is unregistered right after.
    }
  }
}

useSession.subscribe((s, prev) => {
  if (
    s.muted !== prev.muted ||
    s.selected !== prev.selected ||
    s.masterVolume !== prev.masterVolume ||
    s.volumes !== prev.volumes
  ) {
    applyAudio();
  }
  if (s.maximized !== prev.maximized || s.selected !== prev.selected || s.status !== prev.status) syncPlayback();
  // Picking a stream for its sound, or unmuting, takes the sound back from a popped-out window.
  if (!s.muted && (prev.muted || s.selected !== prev.selected) && useAppStore.getState().audioOwner !== 'grid') {
    window.splitwatch.claimAudio('grid');
  }
});
useAppStore.subscribe((s, prev) => {
  if (s.shown !== prev.shown || s.mini !== prev.mini || !s.dialog !== !prev.dialog) syncPlayback();
  if (s.audioOwner !== prev.audioOwner) applyAudio();
});
useEvents.subscribe((s, prev) => {
  if (s.intro !== prev.intro) syncPlayback();
});

// The streams on screen: none while the window is minimized or hidden, the picked one in mini
// mode, the enlarged one in the enlarged view, otherwise all (null).
function visibleStreams(): Set<string> | null {
  const { maximized, selected } = useSession.getState();
  const { shown, mini } = useAppStore.getState();
  // The opening animation and the dialogs hide the grid while they show.
  if (!shown || useEvents.getState().intro || useAppStore.getState().dialog) return new Set();
  if (mini) return new Set(selected ? [selected] : []);
  return maximized ? new Set([maximized]) : null;
}

// YouTube allows no playback from a player the user cannot see: players that leave the screen are
// paused here, and resumed when they come back. A live stream resumes as far behind live as it was.
let retry: ReturnType<typeof setTimeout> | undefined;

function syncPlayback(): void {
  const visible = visibleStreams();
  let buffering = false;
  for (const [id, player] of players) {
    const shown = visible === null || visible.has(id);
    const hold = held.get(id);
    try {
      const state = player.getPlayerState();
      if (!shown && (state === PLAYING || state === BUFFERING)) {
        player.pauseVideo();
        if (!hold) held.set(id, holdOf(player));
        // A player can ignore a pause while it buffers; ask again until it holds.
        if (state === BUFFERING) buffering = true;
      } else if (shown && hold) {
        held.delete(id);
        if (useYouTube.getState().liveStates[id] === 'live') player.seekTo(resumeTime(hold), true);
        player.playVideo();
      }
    } catch {
      // A player that is being destroyed can throw; it is unregistered right after.
    }
  }
  clearTimeout(retry);
  if (buffering) retry = setTimeout(syncPlayback, 1000);
}

// Starts the streams that have waited since the app opened. A player that is not ready yet starts
// when it is (see Tile).
export function playAll(): void {
  for (const id of useSession.getState().waiting) {
    try {
      players.get(id)?.playVideo();
    } catch {
      // not ready
    }
  }
  useSession.setState({ waiting: [] });
}

export function togglePlay(videoId: string | null): void {
  const player = videoId ? players.get(videoId) : undefined;
  if (!player) return;
  const state = player.getPlayerState();
  if (state === PLAYING || state === BUFFERING) player.pauseVideo();
  else player.playVideo();
}

export function seekBy(videoId: string | null, seconds: number): void {
  const player = videoId ? players.get(videoId) : undefined;
  if (!videoId || !player) return;
  player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true);
  // Going back holds the stream back; going forward takes off as much of its delay.
  const { delays, setDelay } = useSession.getState();
  setDelay(videoId, clampDelay((delays[videoId] ?? 0) - seconds));
}

// Holds a stream back by seconds more (fewer when negative), to line it up with the others.
export function delayBy(videoId: string, seconds: number): void {
  const player = players.get(videoId);
  if (!player) return;
  const { delays, setDelay } = useSession.getState();
  const now = delays[videoId] ?? 0;
  const next = clampDelay(now + seconds);
  if (next === now) return;
  try {
    player.seekTo(Math.max(0, player.getCurrentTime() - (next - now)), true);
  } catch {
    return;
  }
  setDelay(videoId, next);
}
