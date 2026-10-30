import type { TFunction } from 'i18next';
import type { GamesEvent } from '../../shared/events';

// "Summer Games", "Youth Winter Games" and so on; the year is added where the edition matters.
export function eventName(t: TFunction, event: GamesEvent): string {
  const kind = event.youth ? (event.kind === 'summer' ? 'youthSummer' : 'youthWinter') : event.kind;
  return t(`event.kind.${kind}`);
}

export const eventTitle = (t: TFunction, event: GamesEvent) =>
  t('event.title', { name: eventName(t, event), year: String(event.year) });
