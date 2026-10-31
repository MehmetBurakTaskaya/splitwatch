import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StreamItem } from '../../shared/ipc';
import { openDialog } from '../state/app';
import { usePrefs } from '../state/prefs';
import { toggleReminder } from '../state/reminders';
import { useSession } from '../state/session';
import { refreshLiveNow, useYouTube } from '../state/youtube';
import { Dialog } from './Dialog';
import { IconClose } from './icons';
import { SportIcon, hasSportIcon } from './sport-icons';

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// The coming week's streams on the preset channels of the Live now sports, by day in the user's
// time zone, with "Remind me"; and the reminders set so far.
export function UpcomingDialog() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const liveNow = useYouTube((s) => s.liveNow);
  const reminders = usePrefs((s) => s.reminders);
  const inGrid = useSession((s) => s.streams);

  useEffect(() => void refreshLiveNow(), []);

  const upcoming = (liveNow?.mode === 'live' ? liveNow.items : [])
    .filter((i): i is StreamItem & { scheduledStart: string } => i.live === 'upcoming' && !!i.scheduledStart)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const days = [...new Set(upcoming.map((i) => dayKey(i.scheduledStart)))];
  const dayFormat = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' });
  const whenFormat = new Intl.DateTimeFormat(lang, {
    weekday: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Dialog title={t('upcoming.title')} onClose={() => openDialog(null)} wide>
      <section className="upcoming-reminders">
        <h3>{t('upcoming.reminders')}</h3>
        {reminders.length === 0 ? (
          <p className="note">{t('upcoming.noReminders')}</p>
        ) : (
          <ul className="followed">
            {[...reminders]
              .sort((a, b) => a.at.localeCompare(b.at))
              .map((r) => (
                <li key={r.videoId}>
                  <span>{whenFormat.format(new Date(r.at))}</span>
                  <span className="spoiler" dir="auto">
                    {r.title}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('upcoming.remove', { title: r.title })}
                    title={t('upcoming.remove', { title: r.title })}
                    onClick={() => toggleReminder(r)}
                  >
                    <IconClose />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {liveNow?.mode !== 'live' ? (
        <p className="note">{t('upcoming.needsKey')}</p>
      ) : days.length === 0 ? (
        <p className="note">{t('upcoming.none')}</p>
      ) : (
        days.map((day) => (
          <section key={day} className="upcoming-day">
            <h3>{dayFormat.format(new Date(`${day}T12:00:00`))}</h3>
            <ul className="event-sports">
              {upcoming
                .filter((i) => dayKey(i.scheduledStart) === day)
                .map((item) => {
                  const reminded = reminders.some((r) => r.videoId === item.videoId);
                  const added = inGrid.includes(item.videoId);
                  return (
                    <li key={item.videoId} className="event-stream upcoming-item">
                      <span className="event-stream-time">{timeFormat.format(new Date(item.scheduledStart))}</span>
                      <span className="event-sport-icon" aria-hidden="true">
                        {item.sport && hasSportIcon(item.sport) && <SportIcon sport={item.sport} />}
                      </span>
                      <span className="event-stream-text">
                        <span className="spoiler" dir="auto">
                          {item.title}
                        </span>
                        <span className="upcoming-channel" dir="auto">
                          {item.sport ? `${t(`sports.${item.sport}`, item.sport)} · ${item.channel}` : item.channel}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="button button-quiet"
                        aria-pressed={reminded}
                        onClick={() =>
                          toggleReminder({
                            videoId: item.videoId,
                            title: item.title,
                            channel: item.channel,
                            at: item.scheduledStart,
                            ...(item.sport ? { sport: item.sport } : {}),
                          })
                        }
                      >
                        {t('upcoming.remind')}
                      </button>
                      <button
                        type="button"
                        className="button button-quiet"
                        disabled={added}
                        onClick={() => useSession.getState().add(item.videoId, item.sport)}
                      >
                        {added ? t('search.added') : t('search.add')}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </Dialog>
  );
}
