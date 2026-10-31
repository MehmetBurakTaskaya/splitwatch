import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localDate } from '../../shared/events';
import { type WatchStats, watchStats } from '../../shared/watch';
import { openDialog } from '../state/app';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { Dialog } from './Dialog';
import { SportIcon } from './sport-icons';

const NO_SPORT = 'none';
const today = () => localDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);

// What the user watched, from the history kept on this computer: time by week, month and sport,
// the channels watched most, and the streams watched lately, which can go back on the grid.
export function HistoryDialog() {
  const { t } = useTranslation();
  const enabled = usePrefs((s) => s.watchHistory);
  const streams = useSession((s) => s.streams);
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void window.splitwatch.getWatch().then((history) => setStats(watchStats(history, today())));
  }, []);

  const duration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return minutes < 60
      ? t('history.minutes', { minutes })
      : t('history.hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  };

  const clear = async () => {
    await window.splitwatch.clearWatch();
    setConfirming(false);
    setStats(watchStats({ entries: [], totals: { seconds: 0, sports: {}, since: null } }, today()));
  };

  const add = (videoId: string) => {
    if (useSession.getState().add(videoId) === 'added') openDialog(null);
  };

  const footer = confirming ? (
    <>
      <p role="alert">{t('history.clearAsk')}</p>
      <button type="button" className="button" onClick={() => void clear()}>
        {t('history.clear')}
      </button>
      <button type="button" className="button button-quiet" autoFocus onClick={() => setConfirming(false)}>
        {t('history.keep')}
      </button>
    </>
  ) : (
    <button
      type="button"
      className="button button-quiet"
      disabled={!stats || stats.total === 0}
      onClick={() => setConfirming(true)}
    >
      {t('history.clearOpen')}
    </button>
  );

  const bars = (rows: { key: string; label: ReactNode; seconds: number }[]) => {
    const most = Math.max(...rows.map((r) => r.seconds), 1);
    return (
      <ul className="watch-bars">
        {rows.map((row) => (
          <li key={row.key} style={{ '--share': row.seconds / most } as CSSProperties}>
            <span className="watch-label">{row.label}</span>
            <span className="watch-value">{duration(row.seconds)}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog title={t('history.title')} onClose={() => openDialog(null)} wide footer={footer}>
      <p className="dialog-meta">{t('history.note')}</p>
      {!enabled && <p className="note">{t('history.off')}</p>}
      {stats && stats.total === 0 && <p>{t('history.empty')}</p>}
      {stats && stats.total > 0 && (
        <div className="watch">
          <dl className="watch-totals">
            <div>
              <dt>{t('history.week')}</dt>
              <dd>{duration(stats.week)}</dd>
            </div>
            <div>
              <dt>{t('history.month')}</dt>
              <dd>{duration(stats.month)}</dd>
            </div>
            <div>
              <dt>{stats.since ? t('history.since', { time: new Date(stats.since) }) : t('history.all')}</dt>
              <dd>{duration(stats.total)}</dd>
            </div>
          </dl>
          <section>
            <h3>{t('history.bySport')}</h3>
            {bars(
              stats.sports.map(({ sport, seconds }) => ({
                key: sport ?? NO_SPORT,
                label: (
                  <>
                    <SportIcon sport={sport} />
                    {sport ? t(`sports.${sport}`, sport) : t('history.noSport')}
                  </>
                ),
                seconds,
              })),
            )}
          </section>
          {stats.channels.length > 0 && (
            <section>
              <h3>{t('history.channels')}</h3>
              {bars(stats.channels.map(({ channel, seconds }) => ({ key: channel, label: channel, seconds })))}
            </section>
          )}
          {stats.recent.length > 0 && (
            <section>
              <h3>{t('history.recent')}</h3>
              <ul className="watch-recent">
                {stats.recent.map((entry) => (
                  <li key={entry.videoId}>
                    <span className="watch-recent-text">
                      <span className="spoiler" dir="auto">
                        {entry.title}
                      </span>
                      <span className="watch-meta">
                        {t('history.meta', {
                          channel: entry.channel,
                          time: new Date(entry.lastAt),
                          duration: duration(entry.seconds),
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="button button-quiet"
                      aria-label={t('history.addLabel', { title: entry.title })}
                      disabled={streams.includes(entry.videoId)}
                      onClick={() => add(entry.videoId)}
                    >
                      {t('history.add')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
