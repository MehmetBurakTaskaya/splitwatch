import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type FollowedChannel, MAX_FOLLOWED } from '../../shared/notify';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs, usePrefs } from '../state/prefs';
import { Dialog } from './Dialog';

const NONE: FollowedChannel[] = [];

// Picks channels to follow from a YouTube subscriptions list (Google Takeout). The ones already
// followed start picked; at most 50 channels can be followed in all.
export function FollowImportDialog() {
  const { t } = useTranslation();
  const channels = useAppStore((s) => s.importedChannels) ?? NONE;
  const notify = usePrefs((s) => s.notify);
  const [picked, setPicked] = useState(() => new Set(notify.channels.map((c) => c.id)));
  const [filter, setFilter] = useState('');
  // Followed channels that are not in the file stay followed and count too.
  const others = notify.channels.filter((c) => !channels.some((x) => x.id === c.id));
  const chosen = others.length + channels.filter((c) => picked.has(c.id)).length;
  const full = chosen >= MAX_FOLLOWED;
  const shown = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase();
    return q ? channels.filter((c) => c.name.toLocaleLowerCase().includes(q)) : channels;
  }, [channels, filter]);

  const back = () => {
    useAppStore.setState({ importedChannels: null });
    openDialog('settings');
  };

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    // The followed ones keep their place; the newly picked ones come after them.
    const kept = notify.channels.filter((c) => picked.has(c.id) || !channels.some((x) => x.id === c.id));
    const added = channels.filter((c) => picked.has(c.id) && !notify.channels.some((x) => x.id === c.id));
    const followed = [...kept, ...added].slice(0, MAX_FOLLOWED);
    setPrefs({ notify: { ...usePrefs.getState().notify, channels: followed } });
    back();
  };

  const toggle = (id: string, on: boolean) => {
    const next = new Set(picked);
    if (on) next.add(id);
    else next.delete(id);
    setPicked(next);
  };

  const footer = (
    <>
      <p className="follow-count" role="status">
        {t('follows.count', { count: chosen, max: MAX_FOLLOWED })}
      </p>
      <button type="button" className="button button-quiet" onClick={back}>
        {t('follows.cancel')}
      </button>
      <button type="submit" form="follow-import" className="button">
        {t('follows.save')}
      </button>
    </>
  );

  return (
    <Dialog title={t('follows.title')} onClose={back} onEnter={save} wide footer={footer}>
      <form id="follow-import" className="follow-import" onSubmit={save}>
        <p className="dialog-meta">{t('follows.intro', { total: channels.length, max: MAX_FOLLOWED })}</p>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('follows.filter')}
          aria-label={t('follows.filter')}
          data-autofocus
        />
        <ul className="follow-list">
          {shown.map((c) => (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  disabled={full && !picked.has(c.id)}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                <span dir="auto">{c.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </form>
    </Dialog>
  );
}
