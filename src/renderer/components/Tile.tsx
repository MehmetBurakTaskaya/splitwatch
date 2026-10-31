import { type CSSProperties, type DragEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { themeForSport } from '../../shared/themes';
import { watchUrl } from '../../shared/youtube';
import { loadIframeApi } from '../player/iframe-api';
import { setMini } from '../hooks/useShortcuts';
import { registerPlayer, seekBy, togglePlay, unregisterPlayer } from '../player/players';
import { openDialog, useAppStore } from '../state/app';
import { setFollowing } from '../state/notify';
import { usePrefs } from '../state/prefs';
import { type PlayerState, useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { THEMES, useTheme } from '../theme/engine';
import {
  IconBack,
  IconBell,
  IconClose,
  IconEnlarge,
  IconExternal,
  IconForward,
  IconGrip,
  IconMini,
  IconMuted,
  IconPause,
  IconPlay,
  IconRestore,
  IconSound,
} from './icons';
import { SportIcon } from './sport-icons';

const STATES: Record<number, PlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

// IFrame Player API error codes: 2 invalid ID, 5 HTML5 player error, 100 not found, 101 and 150 not
// embeddable, 153 missing client identification. -1 is ours: the API script did not load.
function errorKey(code: number | undefined): string {
  if (code === 101 || code === 150) return 'error.embedDisabled';
  if (code === 100) return 'error.notFound';
  if (code === 2) return 'error.invalid';
  if (code === 153) return 'error.identification';
  if (code === -1) return 'error.offline';
  return 'error.playback';
}

export const DRAG_TYPE = 'application/x-splitwatch-stream';

export function Tile({
  videoId,
  index,
  onDragActive,
}: {
  videoId: string;
  index: number;
  onDragActive: (on: boolean) => void;
}) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState(false);
  const status = useSession((s) => s.status[videoId]);
  const info = useSession((s) => s.info[videoId]);
  const selected = useSession((s) => s.selected === videoId);
  const audible = useSession((s) => s.selected === videoId && !s.muted);
  const volume = useSession((s) => s.volumes[videoId] ?? 1);
  const maximized = useSession((s) => s.maximized);
  const layout = useSession((s) => s.layout);
  const mini = useAppStore((s) => s.mini);
  const notifyOn = usePrefs((s) => s.notify.on);
  const channel = useYouTube((s) => s.streamChannels[videoId]);
  const following = usePrefs((s) => (channel ? s.notify.channels.some((c) => c.id === channel.id) : false));
  const audioFocus = usePrefs((s) => s.audioFocus);
  const live = useYouTube((s) => s.liveStates[videoId]);
  const ownSport = useSession((s) => s.sports[videoId]);
  const foundSport = useYouTube((s) => s.streamSports[videoId]);
  const scheme = useTheme((s) => s.scheme);
  const sport = ownSport ? (ownSport === 'none' ? null : ownSport) : (foundSport ?? null);
  const sportTheme = themeForSport(THEMES, sport);

  // One YouTube player per tile, created once and kept while the tile lives.
  useEffect(() => {
    const { setStatus, setInfo, info: known, waiting } = useSession.getState();
    // A restored stream waits for the user unless it is the one allowed to start by itself.
    const autoplay = waiting.includes(videoId) ? 0 : 1;
    let player: YT.Player | null = null;
    let cancelled = false;
    setStatus(videoId, { state: 'loading' });
    if (!(videoId in known)) void window.splitwatch.getVideoInfo(videoId).then((i) => setInfo(videoId, i));
    loadIframeApi()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const target = document.createElement('div');
        hostRef.current.replaceChildren(target);
        player = new YT.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { autoplay, mute: 1, playsinline: 1, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3 },
          events: {
            onReady: (e) => {
              registerPlayer(videoId, e.target);
              useSession.getState().setStatus(videoId, { state: STATES[e.target.getPlayerState()] ?? 'unstarted' });
              // Play all was pressed before this player was ready.
              if (!autoplay && !useSession.getState().waiting.includes(videoId)) e.target.playVideo();
            },
            onStateChange: (e) => {
              const state = STATES[e.data] ?? 'unstarted';
              const session = useSession.getState();
              session.setStatus(videoId, { state });
              if (state === 'playing' && session.waiting.includes(videoId)) {
                useSession.setState({ waiting: session.waiting.filter((id) => id !== videoId) });
              }
            },
            onError: (e) => {
              useSession.getState().setStatus(videoId, { state: 'error', error: Number(e.data) });
              unregisterPlayer(videoId);
            },
          },
        });
      })
      .catch(() => useSession.getState().setStatus(videoId, { state: 'error', error: -1 }));
    return () => {
      cancelled = true;
      unregisterPlayer(videoId);
      try {
        player?.destroy();
      } catch {
        // already gone
      }
    };
  }, [videoId]);

  const state = useSession.getState;
  const pick = () => state().select(videoId, { unmute: true });
  const title = info?.title ?? (info === null ? t('tile.untitled') : t('tile.loading'));
  const failed = status?.state === 'error';
  const playing = status?.state === 'playing' || status?.state === 'buffering';
  const isMax = maximized === videoId;
  const n = index + 1;
  const sportName = sport ? t(`sports.${sport}`, sport) : null;
  const sportLabel = sportName ? t('tile.sport', { index: n, sport: sportName }) : t('tile.sportUnknown', { index: n });

  const toggleEnlarge = () => {
    const enlarge = !isMax;
    state().select(videoId, { unmute: true });
    state().setMaximized(enlarge ? videoId : null);
    window.splitwatch.setFullscreen(enlarge);
  };

  const onDrop = (e: DragEvent) => {
    setDropTarget(false);
    const source = e.dataTransfer.getData(DRAG_TYPE);
    if (source && source !== videoId) {
      e.preventDefault();
      state().swap(source, videoId);
    }
  };

  return (
    <section
      className={[
        'tile',
        selected && 'is-selected',
        audible && 'is-audible',
        isMax && 'is-maximized',
        dropTarget && 'is-drop-target',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ order: index, ...(sportTheme && { '--tile-accent': sportTheme[scheme].ui.accent }) } as CSSProperties}
      data-stream={videoId}
      data-sport={sport ?? undefined}
      data-slot={index}
      data-layout={layout}
      data-state={status?.state ?? 'loading'}
      data-error={status?.error}
      aria-label={t('tile.label', { index: n, title })}
      tabIndex={-1}
      onPointerEnter={audioFocus === 'hover' ? () => state().select(videoId) : undefined}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_TYPE)) {
          e.preventDefault();
          setDropTarget(true);
        }
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={onDrop}
    >
      <div className="tile-player">
        <div ref={hostRef} className="tile-frame" hidden={failed} />
        {failed && (
          <div className="tile-error" role="alert">
            <p>{t(errorKey(status?.error))}</p>
            {status?.error !== undefined && status.error > 0 && (
              <p className="tile-error-code">{t('error.code', { code: status.error })}</p>
            )}
            <a className="button" href={watchUrl(videoId)} target="_blank" rel="noreferrer">
              {t('tile.openOnYouTube')}
            </a>
          </div>
        )}
      </div>
      <div className="tile-bar">
        <span
          className="icon-button tile-grip"
          draggable
          role="img"
          aria-label={t('tile.move', { index: n })}
          title={t('tile.move', { index: n })}
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_TYPE, videoId);
            e.dataTransfer.effectAllowed = 'move';
            onDragActive(true);
          }}
          onDragEnd={() => onDragActive(false)}
        >
          <IconGrip />
        </span>
        <span className="tile-number" aria-hidden="true" onClick={pick}>
          {n}
        </span>
        <button
          type="button"
          className={sport ? 'icon-button tile-sport' : 'icon-button tile-sport is-unknown optional'}
          aria-label={sportLabel}
          title={sportLabel}
          onClick={() => openDialog('sport', videoId)}
        >
          <SportIcon sport={sport} />
        </button>
        <span className="tile-title" onClick={pick}>
          <span className="tile-name" dir="auto" title={title}>
            {live === 'live' && <span className="badge badge-live">{t('live.badge')}</span>}
            {live === 'upcoming' && <span className="badge">{t('live.upcoming')}</span>}
            <span className="spoiler">{title}</span>
          </span>
          {info?.channel && (
            <span className="tile-channel" dir="auto">
              {info.channel}
            </span>
          )}
        </span>
        {notifyOn && channel && (
          <button
            type="button"
            className="icon-button optional"
            aria-pressed={following}
            aria-label={t('tile.follow', { channel: channel.name })}
            title={t('tile.follow', { channel: channel.name })}
            onClick={() => setFollowing(channel, !following)}
          >
            <IconBell />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-pressed={audible}
          aria-label={audible ? t('tile.listening', { index: n }) : t('tile.listen', { index: n })}
          title={audible ? t('tile.listening', { index: n }) : t('tile.listen', { index: n })}
          onClick={() => (audible ? state().toggleMute() : pick())}
        >
          {audible ? <IconSound /> : <IconMuted />}
        </button>
        <input
          className="tile-volume optional"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          aria-label={t('tile.volume', { index: n })}
          onChange={(e) => state().setVolume(videoId, Number(e.target.value) / 100)}
        />
        <button
          type="button"
          className="icon-button"
          disabled={failed}
          aria-label={playing ? t('tile.pause') : t('tile.play')}
          title={playing ? t('tile.pause') : t('tile.play')}
          onClick={() => togglePlay(videoId)}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          type="button"
          className="icon-button optional"
          disabled={failed}
          aria-label={t('tile.back')}
          title={t('tile.back')}
          onClick={() => seekBy(videoId, -10)}
        >
          <IconBack />
        </button>
        <button
          type="button"
          className="icon-button optional"
          disabled={failed}
          aria-label={t('tile.forward')}
          title={t('tile.forward')}
          onClick={() => seekBy(videoId, 10)}
        >
          <IconForward />
        </button>
        <a
          className="icon-button optional"
          href={watchUrl(videoId)}
          target="_blank"
          rel="noreferrer"
          aria-label={t('tile.openOnYouTube')}
          title={t('tile.openOnYouTube')}
        >
          <IconExternal />
        </a>
        {mini ? (
          <button
            type="button"
            className="icon-button"
            aria-label={t('tile.leaveMini')}
            title={t('tile.leaveMini')}
            onClick={() => setMini(false)}
          >
            <IconRestore />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="icon-button optional"
              aria-label={t('tile.mini', { index: n })}
              title={t('tile.mini', { index: n })}
              onClick={() => {
                state().select(videoId, { unmute: true });
                setMini(true);
              }}
            >
              <IconMini />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-pressed={isMax}
              aria-label={isMax ? t('tile.restore') : t('tile.enlarge')}
              title={isMax ? t('tile.restore') : t('tile.enlarge')}
              onClick={toggleEnlarge}
            >
              {isMax ? <IconRestore /> : <IconEnlarge />}
            </button>
          </>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={t('tile.remove', { index: n })}
          title={t('tile.remove', { index: n })}
          onClick={() => {
            if (useAppStore.getState().fullscreen && isMax) window.splitwatch.setFullscreen(false);
            state().remove(videoId);
          }}
        >
          <IconClose />
        </button>
      </div>
    </section>
  );
}
