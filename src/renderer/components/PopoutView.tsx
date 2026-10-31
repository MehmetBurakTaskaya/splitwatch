import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoInfo } from '../../shared/ipc';
import { loadIframeApi } from '../player/iframe-api';
import { type Held, holdOf, resumeTime } from '../player/live';
import { IconMuted, IconPause, IconPlay, IconRestore, IconSound } from './icons';

const PLAYING = 1;
const BUFFERING = 3;

// A stream in a window of its own: one player and a bar. The sound comes from here only while this
// window owns it (the grid hands it over, or the sound button claims it). Like the grid, the player
// pauses while the window is minimized or hidden.
export function PopoutView({ videoId, live }: { videoId: string; live: boolean }) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player | null>(null);
  const held = useRef<Held | null>(null);
  const volume = useRef(100);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [owner, setOwner] = useState('grid');
  const [playing, setPlaying] = useState(false);
  const audible = owner === videoId;

  useEffect(() => {
    void window.splitwatch.getVideoInfo(videoId).then((i) => {
      setInfo(i);
      if (i) document.title = `${i.title} – Splitwatch`;
    });
    void window.splitwatch.getSettings().then(({ session }) => {
      volume.current = Math.round((session.volumes[videoId] ?? 1) * session.masterVolume * 100);
    });
    void window.splitwatch.getAudioOwner().then(setOwner);
    return window.splitwatch.onAudioOwner(setOwner);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    void loadIframeApi().then(() => {
      if (cancelled || !host.current) return;
      const target = document.createElement('div');
      host.current.replaceChildren(target);
      new YT.Player(target, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3 },
        events: {
          onReady: (e) => {
            player.current = e.target;
            setOwner((o) => o);
          },
          onStateChange: (e) => setPlaying(e.data === PLAYING || e.data === BUFFERING),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Sound follows the owner.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    try {
      if (audible) {
        p.setVolume(volume.current);
        p.unMute();
      } else {
        p.mute();
      }
    } catch {
      // not ready
    }
  }, [audible, playing]);

  // No playback while the window is off screen.
  useEffect(
    () =>
      window.splitwatch.onShownChange((shown) => {
        const p = player.current;
        if (!p) return;
        try {
          const state = p.getPlayerState();
          if (!shown && (state === PLAYING || state === BUFFERING)) {
            p.pauseVideo();
            held.current ??= holdOf(p);
          } else if (shown && held.current) {
            if (live) p.seekTo(resumeTime(held.current), true);
            held.current = null;
            p.playVideo();
          }
        } catch {
          // not ready
        }
      }),
    [live],
  );

  const toggle = () => {
    const p = player.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
  const title = info?.title ?? t('tile.loading');

  return (
    <div className="popout">
      <div ref={host} className="popout-player" />
      <div className="tile-bar popout-bar">
        <span className="tile-title">
          <span className="tile-name" dir="auto" title={title}>
            <span className="spoiler">{title}</span>
          </span>
          {info?.channel && (
            <span className="tile-channel" dir="auto">
              {info.channel}
            </span>
          )}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-pressed={audible}
          aria-label={audible ? t('popout.soundOn') : t('popout.soundOff')}
          title={audible ? t('popout.soundOn') : t('popout.soundOff')}
          onClick={() => window.splitwatch.claimAudio(audible ? 'grid' : videoId)}
        >
          {audible ? <IconSound /> : <IconMuted />}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={playing ? t('tile.pause') : t('tile.play')}
          title={playing ? t('tile.pause') : t('tile.play')}
          onClick={toggle}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={t('popout.back')}
          title={t('popout.back')}
          onClick={() => window.splitwatch.closePopout(videoId)}
        >
          <IconRestore />
        </button>
      </div>
    </div>
  );
}
