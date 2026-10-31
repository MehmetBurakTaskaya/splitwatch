import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoInfo } from '../../shared/ipc';
import { openDialog, useAppStore } from '../state/app';
import { saveShared } from '../state/layouts';
import { useSession } from '../state/session';
import { Dialog } from './Dialog';

// A layout from a splitwatch:// link: its streams by title, to open (which replaces the grid) or to
// keep in the saved layouts. Nothing happens without the user's answer.
export function SharedDialog() {
  const { t } = useTranslation();
  const shared = useAppStore((s) => s.shared);
  const [titles, setTitles] = useState<Record<string, VideoInfo | null>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!shared) return;
    for (const id of shared.streams) {
      void window.splitwatch.getVideoInfo(id).then((info) => setTitles((known) => ({ ...known, [id]: info })));
    }
  }, [shared]);

  if (!shared) return null;
  const close = () => {
    useAppStore.setState({ shared: null });
    openDialog(null);
  };

  return (
    <Dialog title={t('shared.title')} onClose={close}>
      <p className="event-where" dir="auto">
        {shared.name ?? t('shared.unnamed')}
      </p>
      <p className="note">
        {t('shared.summary', { count: shared.streams.length, layout: t(`layout.${shared.layout}`) })}
      </p>
      <ol className="shared-streams">
        {shared.streams.map((id) => (
          <li key={id} dir="auto">
            <span className="spoiler">{titles[id]?.title ?? id}</span>
            {shared.sports[id] && (
              <span className="note"> · {t(`sports.${shared.sports[id]}`, shared.sports[id])}</span>
            )}
          </li>
        ))}
      </ol>
      <p className="note">{t('shared.note')}</p>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button button-quiet" onClick={close}>
          {t('shared.cancel')}
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={() =>
            setMessage(saveShared(shared, t('shared.defaultName')) === 'saved' ? t('shared.saved') : t('shared.full'))
          }
        >
          {t('shared.save')}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            useSession.getState().open({ ...shared, selected: shared.streams[0] ?? null, volumes: {} });
            close();
          }}
        >
          {t('shared.open')}
        </button>
      </div>
    </Dialog>
  );
}
