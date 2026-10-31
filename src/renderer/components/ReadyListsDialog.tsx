import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MIX, READY_KINDS, type ReadyKind, type ReadyList } from '../../shared/ready-lists';
import { openDialog } from '../state/app';
import { openReadyList, themeSport } from '../state/ready';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { Dialog } from './Dialog';
import { IconShuffle } from './icons';
import { SportIcon } from './sport-icons';

const KIND_LABELS: Record<ReadyKind, string> = {
  all: 'ready.kindAll',
  live: 'ready.kindLive',
  videos: 'ready.kindVideos',
};

// Ready lists (ADR 0014): up to nine streams of a sport, or one each of nine sports, side by side in
// one click. The sport of the picked theme comes first.
export function ReadyListsDialog() {
  const { t } = useTranslation();
  const presets = useYouTube((s) => s.presets);
  const inGrid = useSession((s) => s.streams.length);
  const sports = useMemo(
    () =>
      [...new Set(presets.map((p) => p.sport))].sort((a, b) => t(`sports.${a}`, a).localeCompare(t(`sports.${b}`, b))),
    [presets, t],
  );
  const [sport, setSport] = useState(() => themeSport() ?? MIX);
  const [kind, setKind] = useState<ReadyKind>('all');
  const [list, setList] = useState<ReadyList | null>(null);
  // A new round draws the mix again.
  const [round, setRound] = useState(0);

  useEffect(() => {
    let current = true;
    setList(null);
    void window.splitwatch.getReadyList(sport, kind).then((result) => current && setList(result));
    return () => {
      current = false;
    };
  }, [sport, kind, round]);

  const count = list?.items.length ?? 0;
  const live = list?.items.filter((i) => i.live === 'live').length ?? 0;
  const open = () => {
    if (!list || !count) return;
    openReadyList(list);
    openDialog(null);
  };

  let status: string;
  if (!list) status = t('ready.loading');
  else if (count === 0 && kind === 'live') status = list.liveKnown ? t('ready.noneLive') : t('ready.needsKey');
  else if (count === 0) status = t('ready.none');
  else if (list.liveKnown) status = t('ready.found', { count, live, videos: count - live });
  else status = t('ready.foundLatest', { count });

  const footer = (
    <>
      <p className="ready-status" role="status">
        {status}
      </p>
      {sport === MIX && (
        <button type="button" className="button button-quiet" onClick={() => setRound((r) => r + 1)}>
          <IconShuffle />
          {t('ready.shuffle')}
        </button>
      )}
      <button type="button" className="button" disabled={!count} onClick={open}>
        {inGrid ? t('ready.replace', { count }) : t('ready.open', { count })}
      </button>
    </>
  );

  return (
    <Dialog title={t('ready.title')} onClose={() => openDialog(null)} onEnter={open} wide footer={footer}>
      <p className="note">{t('ready.note')}</p>
      <fieldset className="field">
        <legend>{t('ready.sport')}</legend>
        <div className="sport-grid sport-choices">
          <label>
            <input type="radio" name="ready-sport" checked={sport === MIX} onChange={() => setSport(MIX)} />
            <IconShuffle />
            {t('ready.mix')}
          </label>
          {sports.map((s) => (
            <label key={s}>
              <input type="radio" name="ready-sport" checked={sport === s} onChange={() => setSport(s)} />
              <SportIcon sport={s} />
              {t(`sports.${s}`, s)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field ready-kinds">
        <legend>{t('ready.kind')}</legend>
        {READY_KINDS.map((k) => (
          <label key={k}>
            <input type="radio" name="ready-kind" checked={kind === k} onChange={() => setKind(k)} />
            {t(KIND_LABELS[k])}
          </label>
        ))}
      </fieldset>
      {inGrid > 0 && count > 0 && <p className="note">{t('ready.replaceNote', { count: inGrid })}</p>}
      {list && !list.liveKnown && kind !== 'live' && count > 0 && <p className="note">{t('ready.latestNote')}</p>}
      {list && count > 0 && (
        <ol className="ready-items">
          {list.items.map((item) => (
            <li key={item.videoId} className="stream-item">
              <SportIcon sport={item.sport ?? null} />
              {item.live === 'live' && <span className="badge badge-live">{t('live.badge')}</span>}
              <span className="ready-title spoiler" dir="auto">
                {item.title}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
