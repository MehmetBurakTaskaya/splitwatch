import { useTranslation } from 'react-i18next';
import type { StreamItem } from '../../shared/ipc';
import { useSession } from '../state/session';

// A list of streams to add: thumbnail, title, channel, live state and an Add button.
export function StreamList({ items, label }: { items: StreamItem[]; label: string }) {
  const { t } = useTranslation();
  const inGrid = useSession((s) => s.streams);

  return (
    <ul className="stream-list" aria-label={label}>
      {items.map((item) => {
        const added = inGrid.includes(item.videoId);
        return (
          <li key={item.videoId} className="stream-item">
            <img
              className="stream-thumb"
              src={`https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              width={128}
              height={72}
            />
            <span className="stream-text">
              <span className="stream-title" dir="auto">
                {item.title}
              </span>
              <span className="stream-meta">
                {item.live === 'live' && <span className="badge badge-live">{t('live.badge')}</span>}
                {item.live === 'upcoming' && (
                  <span className="badge">
                    {item.scheduledStart
                      ? t('live.startsAt', { time: new Date(item.scheduledStart) })
                      : t('live.upcoming')}
                  </span>
                )}
                {item.sport && <span className="stream-sport">{t(`sports.${item.sport}`, item.sport)}</span>}
                <span className="stream-channel" dir="auto">
                  {item.channel}
                </span>
              </span>
            </span>
            <button
              type="button"
              className={added ? 'button button-quiet' : 'button'}
              disabled={added}
              aria-label={added ? t('search.added') : t('live.add', { title: item.title })}
              onClick={() => useSession.getState().add(item.videoId)}
            >
              {added ? t('search.added') : t('search.add')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
