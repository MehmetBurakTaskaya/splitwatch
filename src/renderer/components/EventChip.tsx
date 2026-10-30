import { useTranslation } from 'react-i18next';
import { type GamesEvent, eventPhase } from '../../shared/events';
import { eventName } from '../event/names';
import { openDialog } from '../state/app';
import { useActiveEvent, useEvents, useSuggestion } from '../state/events';
import { IconSnowflake, IconSun } from './icons';

// In the top bar while an event mode is on (its countdown or day), or while an event is near and
// its mode is offered. It opens the event's schedule and medals.
export function EventChip() {
  const { t } = useTranslation();
  const active = useActiveEvent();
  const suggestion = useSuggestion();
  const now = useEvents((s) => s.now);
  const event: GamesEvent | null = active ?? suggestion;
  if (!event) return null;
  const name = eventName(t, event);
  const phase = eventPhase(event, new Date(now));
  const label =
    phase.phase === 'before'
      ? t('event.chipBefore', { name, days: phase.days })
      : phase.phase === 'during'
        ? t('event.chipDuring', { name, day: phase.day })
        : name;

  return (
    <button
      type="button"
      className={active ? 'event-chip' : 'event-chip is-suggestion'}
      data-event-kind={event.kind}
      aria-label={`${label}. ${t('event.open', { name })}`}
      title={t('event.open', { name })}
      onClick={() => openDialog('event')}
    >
      {event.kind === 'summer' ? <IconSun /> : <IconSnowflake />}
      <span className="event-chip-label">{label}</span>
    </button>
  );
}
