import { useAppStore } from '../state/app';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';

// The live YouTube players, by video ID. Sound is set here from the session: only the picked
// stream is audible (unless everything is muted); the others play muted.
const players = new Map<string, YT.Player>();
// Players paused here because they left the screen, to be resumed when they are back.
const held = new Set<string>();

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
  for (const [id, player] of players) {
    try {
      if (!muted && selected === id) {
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
});
useAppStore.subscribe((s, prev) => {
  if (s.shown !== prev.shown || s.mini !== prev.mini) syncPlayback();
});

// The streams on screen: none while the window is minimized or hidden, the picked one in mini
// mode, the enlarged one in the enlarged view, otherwise all (null).
function visibleStreams(): Set<string> | null {
  const { maximized, selected } = useSession.getState();
  const { shown, mini } = useAppStore.getState();
  if (!shown) return new Set();
  if (mini) return new Set(selected ? [selected] : []);
  return maximized ? new Set([maximized]) : null;
}

// YouTube allows no playback from a player the user cannot see: players that leave the screen are
// paused here, and resumed when they come back. A live stream resumes at its live edge.
function syncPlayback(): void {
  const visible = visibleStreams();
  for (const [id, player] of players) {
    const shown = visible === null || visible.has(id);
    try {
      const state = player.getPlayerState();
      if (!shown && (state === PLAYING || state === BUFFERING)) {
        player.pauseVideo();
        held.add(id);
      } else if (shown && held.has(id)) {
        held.delete(id);
        // For a live stream, getDuration() is the time since the stream began: its live edge.
        if (useYouTube.getState().liveStates[id] === 'live') player.seekTo(player.getDuration(), true);
        player.playVideo();
      }
    } catch {
      // A player that is being destroyed can throw; it is unregistered right after.
    }
  }
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
  if (player) player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true);
}
