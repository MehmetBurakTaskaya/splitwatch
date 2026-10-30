import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GamesEvent, eventDays, eventPhase, localDate, sportsOn } from '../../shared/events';
import type { MedalTable, StreamItem } from '../../shared/ipc';
import { layoutFor } from '../../shared/layouts';
import { countryList, countryName, isoOfTeam, mentionsCountry, teamOfIso } from '../event/countries';
import { eventName, eventTitle } from '../event/names';
import { openDialog, openSearch, useAppStore } from '../state/app';
import {
  dismiss,
  setCountry,
  setSnow,
  toggleReminder,
  turnOff,
  turnOn,
  useActiveEvent,
  useEvents,
  useSortedEvents,
  useSuggestion,
} from '../state/events';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { Dialog } from './Dialog';
import { SportIcon, hasSportIcon } from './sport-icons';

const TABS = ['schedule', 'medals'] as const;

const dayNumber = (event: GamesEvent, date: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${event.start}T00:00:00Z`)) / 86_400_000) + 1;

// The Summer and Winter Games: the event's dates and mode, a day-by-day schedule and the medal table.
export function EventDialog() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const events = useSortedEvents();
  const active = useActiveEvent();
  const suggestion = useSuggestion();
  const now = useEvents((s) => s.now);
  const systemCountry = useAppStore((s) => s.info?.country);
  const chosenCountry = usePrefs((s) => s.event.country);
  const snow = usePrefs((s) => s.event.snow);
  const [picked, setPicked] = useState<string | null>(null);
  const [tab, setTab] = useState<'schedule' | 'medals'>('schedule');
  const countries = useMemo(() => countryList(lang), [lang]);

  const event = events.find((e) => e.id === picked) ?? active ?? suggestion ?? events[0];
  if (!event) return null;
  const country = chosenCountry ?? (systemCountry && teamOfIso(systemCountry) ? systemCountry : null);
  const name = eventName(t, event);
  const phase = eventPhase(event, new Date(now));
  const dates = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatRange(new Date(`${event.start}T12:00:00Z`), new Date(`${event.end}T12:00:00Z`));
  const status =
    phase.phase === 'before'
      ? t('event.before', { days: phase.days })
      : phase.phase === 'during'
        ? t('event.during', { day: phase.day, total: dayNumber(event, event.end) })
        : t('event.after');
  const isActive = active?.id === event.id;

  return (
    <Dialog title={eventTitle(t, event)} onClose={() => openDialog(null)} wide>
      <div className="event-head" data-event-kind={event.kind}>
        <label className="event-field">
          <span>{t('event.pick')}</span>
          <select value={event.id} onChange={(e) => setPicked(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {`${eventTitle(t, e)} · ${e.place}`}
              </option>
            ))}
          </select>
        </label>
        <p className="event-where">
          {t('event.where', { place: event.place, dates })} {status}
        </p>
        {isActive ? (
          <p className="note">{t('event.modeOn', { name })}</p>
        ) : (
          suggestion?.id === event.id && <p className="note">{t('event.suggest', { name })}</p>
        )}
        <div className="event-actions">
          {isActive ? (
            <button type="button" className="button button-quiet" onClick={turnOff}>
              {t('event.turnOff')}
            </button>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => {
                turnOn(event.id);
                openDialog(null);
              }}
            >
              {t('event.turnOn', { name })}
            </button>
          )}
          {!isActive && suggestion?.id === event.id && (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                dismiss(event.id);
                openDialog(null);
              }}
            >
              {t('event.notNow')}
            </button>
          )}
        </div>
        <div className="event-options">
          <label className="event-field">
            <span>{t('event.country')}</span>
            <select value={country ?? ''} onChange={(e) => setCountry(e.target.value)}>
              {!country && <option value="" />}
              {countries.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {event.kind === 'winter' && (
            <label className="event-field">
              <span>{t('event.snow')}</span>
              <select value={snow} onChange={(e) => setSnow(Number(e.target.value))}>
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {t(`event.snowLevels.${n}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="event-tabs" role="tablist" aria-label={t('event.tabs')}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`event-tab-${name}`}
            aria-selected={tab === name}
            aria-controls="event-panel"
            className="event-tab"
            onClick={() => setTab(name)}
          >
            {t(`event.${name}`)}
          </button>
        ))}
      </div>
      <div id="event-panel" role="tabpanel" aria-labelledby={`event-tab-${tab}`}>
        {tab === 'schedule' ? (
          <Schedule key={event.id} event={event} country={country} />
        ) : (
          <Medals key={event.id} event={event} country={country} />
        )}
      </div>
    </Dialog>
  );
}

function Schedule({ event, country }: { event: GamesEvent; country: string | null }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const now = useEvents((s) => s.now);
  const liveNow = useYouTube((s) => s.liveNow);
  const presets = useYouTube((s) => s.presets);
  const reminders = usePrefs((s) => s.event.reminders);
  const days = eventDays(event);
  const today = localDate(new Date(now), event.timezone);
  const [day, setDay] = useState(days.includes(today) ? today : days[0]!);

  if (!event.calendar.length) return <p className="note">{t('event.scheduleNone')}</p>;

  const sports = sportsOn(event, day);
  const hasPreset = (sport: string) => presets.some((p) => p.sport === sport);
  // Streams of the preset channels for this day: live ones today, upcoming ones that start on it.
  const streams = (liveNow?.mode === 'live' ? liveNow.items : []).filter((item) =>
    item.live === 'live'
      ? day === today
      : !!item.scheduledStart && localDate(new Date(item.scheduledStart), event.timezone) === day,
  );
  const mentions = (item: StreamItem) => !!country && mentionsCountry(item.title, country, lang);
  const of = (sport: string) =>
    streams.filter((s) => s.sport === sport).sort((a, b) => Number(mentions(b)) - Number(mentions(a)));
  const finals = sports
    .filter((s) => s.medals > 0)
    .flatMap((s) => of(s.sport).filter((i) => i.live === 'live'))
    .slice(0, 4);
  const dayFormat = new Intl.DateTimeFormat(lang, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const timeFormat = new Intl.DateTimeFormat(lang, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

  const openFinals = () => {
    const ids = finals.map((f) => f.videoId);
    useSession.getState().open({
      layout: layoutFor(ids.length),
      streams: ids,
      selected: ids[0] ?? null,
      volumes: {},
      sports: Object.fromEntries(finals.flatMap((f) => (f.sport ? [[f.videoId, f.sport]] : []))),
    });
    openDialog(null);
  };

  return (
    <section className="event-schedule">
      <div className="event-days" role="group" aria-label={t('event.days')}>
        {days.map((d) => (
          <button
            key={d}
            type="button"
            className="event-day"
            aria-pressed={d === day}
            data-today={d === today || undefined}
            onClick={() => setDay(d)}
          >
            <span>{dayFormat.format(new Date(`${d}T12:00:00Z`))}</span>
            <span className="event-day-number">{t('event.dayLabel', { day: dayNumber(event, d) })}</span>
          </button>
        ))}
      </div>
      <div className="event-day-actions">
        <button type="button" className="button" disabled={!finals.length} onClick={openFinals}>
          {t('event.finals', { count: finals.length })}
        </button>
        {!finals.length && <p className="note">{t('event.finalsNone')}</p>}
      </div>
      {sports.length === 0 ? (
        <p className="note">{t('event.dayEmpty')}</p>
      ) : (
        <ul className="event-sports">
          {sports.map(({ sport, medals }) => (
            <li key={sport} className="event-sport">
              <div className="event-sport-row">
                <span className="event-sport-icon" aria-hidden="true">
                  {hasSportIcon(sport) && <SportIcon sport={sport} />}
                </span>
                <span className="event-sport-name">{t(`sports.${sport}`, sport)}</span>
                <span className={medals ? 'badge badge-medals' : 'badge'}>
                  {medals ? t('event.medalEvents', { count: medals }) : t('event.competition')}
                </span>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() =>
                    hasPreset(sport) ? openSearch('', sport) : openSearch(t(`sports.${sport}`, sport), null)
                  }
                >
                  {t('event.findStreams')}
                </button>
              </div>
              {of(sport).map((item) => {
                const reminded = reminders.some((r) => r.videoId === item.videoId);
                return (
                  <div key={item.videoId} className="event-stream">
                    <span className="event-stream-text" dir="auto">
                      {item.live === 'live' ? (
                        <span className="badge badge-live">{t('event.live')}</span>
                      ) : (
                        <span className="event-stream-time">{timeFormat.format(new Date(item.scheduledStart!))}</span>
                      )}
                      {mentions(item) && (
                        <span className="badge">{t('event.mentions', { country: countryName(country!, lang) })}</span>
                      )}
                      {item.title}
                    </span>
                    {item.live === 'live' ? (
                      <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => {
                          useSession.getState().add(item.videoId, sport);
                          openDialog(null);
                        }}
                      >
                        {t('event.add')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-quiet"
                        aria-pressed={reminded}
                        onClick={() =>
                          toggleReminder({
                            videoId: item.videoId,
                            title: item.title,
                            channel: item.channel,
                            at: item.scheduledStart!,
                            sport,
                          })
                        }
                      >
                        {t('event.remind')}
                      </button>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      )}
      <p className="note">{t('event.scheduleSource')}</p>
    </section>
  );
}

function Medals({ event, country }: { event: GamesEvent; country: string | null }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [state, setState] = useState<{ loading: boolean; table: MedalTable | null }>({ loading: true, table: null });

  useEffect(() => {
    if (!event.medalsPage) return;
    let alive = true;
    void window.splitwatch.getMedalTable(event.id).then((table) => {
      if (alive) setState({ loading: false, table });
    });
    return () => {
      alive = false;
    };
  }, [event.id, event.medalsPage]);

  if (!event.medalsPage) return <p className="note">{t('event.medalsNone')}</p>;
  if (state.loading) return <p className="note">{t('event.medalsLoading')}</p>;
  if (!state.table || !state.table.rows.length) return <p className="note">{t('event.medalsError')}</p>;

  const teamName = (code: string) => {
    const iso = isoOfTeam(code);
    return iso ? countryName(iso, lang) : t(`event.teams.${code}`, code);
  };
  const number = new Intl.NumberFormat(lang);

  return (
    <section className="event-medals">
      <table className="medal-table">
        <thead>
          <tr>
            <th scope="col">{t('event.cols.rank')}</th>
            <th scope="col">{t('event.cols.team')}</th>
            <th scope="col">{t('event.cols.gold')}</th>
            <th scope="col">{t('event.cols.silver')}</th>
            <th scope="col">{t('event.cols.bronze')}</th>
            <th scope="col">{t('event.cols.total')}</th>
          </tr>
        </thead>
        <tbody>
          {state.table.rows.map((row) => (
            <tr key={row.code} className={country && isoOfTeam(row.code) === country ? 'is-followed' : undefined}>
              <td>{row.rank === null ? '–' : number.format(row.rank)}</td>
              <th scope="row">
                <span dir="auto">{teamName(row.code)}</span> <span className="medal-code">{row.code}</span>
              </th>
              <td>{number.format(row.gold)}</td>
              <td>{number.format(row.silver)}</td>
              <td>{number.format(row.bronze)}</td>
              <td>{number.format(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        {t('event.medalsSource')}{' '}
        <a href={state.table.url} target="_blank" rel="noreferrer">
          {t('event.medalsOpen')}
        </a>
      </p>
    </section>
  );
}
