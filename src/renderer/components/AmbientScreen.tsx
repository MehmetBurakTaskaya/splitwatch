import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StreamItem } from '../../shared/ipc';
import { type NextItem, STARTED_KEEP, nextUp } from '../../shared/reminders';
import { useAppStore } from '../state/app';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { refreshLiveNow, useYouTube } from '../state/youtube';
import { IconBell } from './icons';

const IDLE_AFTER = 3000;
const NO_ITEMS: StreamItem[] = [];

// The waiting screen: a calm, full-window clock over the backdrop, with the next streams counting
// down (the reminders, and the coming streams on the Live now channels). The display stays on while
// it shows; the pointer hides when it rests. A started stream can go on the grid from here.
export function AmbientScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [now, setNow] = useState(() => Date.now());
  const [idle, setIdle] = useState(false);
  const reminders = usePrefs((s) => s.reminders);
  const items = useYouTube((s) => (s.liveNow?.mode === 'live' ? s.liveNow.items : NO_ITEMS));
  const next = nextUp(reminders, items, now);

  useEffect(() => {
    void refreshLiveNow();
    window.splitwatch.keepAwake(true);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let rest: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      setIdle(false);
      clearTimeout(rest);
      rest = setTimeout(() => setIdle(true), IDLE_AFTER);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave();
      else wake();
    };
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', onKey);
    return () => {
      window.splitwatch.keepAwake(false);
      clearInterval(tick);
      clearTimeout(rest);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const time = new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const later = new Intl.DateTimeFormat(lang, { weekday: 'long', hour: 'numeric', minute: '2-digit' });

  const when = (item: NextItem) => {
    const minutes = Math.ceil((item.at - now) / 60_000);
    if (minutes <= 0) return t('ambient.now');
    if (minutes < 60) return t('ambient.inMinutes', { minutes });
    if (minutes < 12 * 60) return t('ambient.inHours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
    return later.format(item.at);
  };

  return (
    <main className="ambient" data-idle={idle || undefined}>
      <h1 className="visually-hidden">{t('ambient.title')}</h1>
      <div className="ambient-clock">
        <time className="ambient-time" dateTime={new Date(now).toISOString()}>
          {time.formatToParts(now).map((part, i) =>
            part.type === 'dayPeriod' ? (
              <span key={i} className="ambient-period">
                {part.value}
              </span>
            ) : (
              part.value
            ),
          )}
        </time>
        <p className="ambient-date">{date.format(now)}</p>
      </div>
      {next.length > 0 ? (
        <section className="ambient-next" aria-label={t('ambient.next')}>
          <h2>{t('ambient.next')}</h2>
          <ol>
            {next.map((item) => (
              <li key={item.videoId} data-started={item.at <= now || undefined}>
                <span className="ambient-when">
                  {item.reminded && <IconBell />}
                  {when(item)}
                </span>
                <span className="ambient-title spoiler" dir="auto">
                  {item.title}
                </span>
                <span className="ambient-channel">{item.channel}</span>
                {item.at <= now && now - item.at < STARTED_KEEP && (
                  <button
                    type="button"
                    className="button"
                    aria-label={t('ambient.watchLabel', { title: item.title })}
                    onClick={() => useSession.getState().add(item.videoId)}
                  >
                    {t('ambient.watch')}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="ambient-none">{t('ambient.none')}</p>
      )}
      <button type="button" className="button button-quiet ambient-leave" onClick={leave}>
        {t('ambient.leave')}
      </button>
    </main>
  );
}

function leave(): void {
  useAppStore.setState({ ambient: false });
}
