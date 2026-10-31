import { create } from 'zustand';
import { type EventSettings, type GamesEvent, sortEvents, suggestedEvent } from '../../shared/events';
import { setPrefs, usePrefs } from './prefs';

interface EventsState {
  events: GamesEvent[];
  // Refreshed every minute, for the countdowns.
  now: number;
  // The event whose opening animation is playing.
  intro: string | null;
}

export const useEvents = create<EventsState>(() => ({ events: [], now: Date.now(), intro: null }));

export function connectEvents(): void {
  void window.splitwatch.getEvents().then((events) => useEvents.setState({ events }));
  setInterval(() => useEvents.setState({ now: Date.now() }), 60_000);
}

function setEventPrefs(patch: Partial<EventSettings>): void {
  setPrefs({ event: { ...usePrefs.getState().event, ...patch } });
}

// The event whose mode is on, if it is still in the calendar.
export function activeEvent(events: GamesEvent[], active: string | null): GamesEvent | null {
  return events.find((e) => e.id === active) ?? null;
}

export function useActiveEvent(): GamesEvent | null {
  const events = useEvents((s) => s.events);
  const active = usePrefs((s) => s.event.active);
  return activeEvent(events, active);
}

// The event to offer while no mode is on.
export function useSuggestion(): GamesEvent | null {
  const events = useEvents((s) => s.events);
  const now = useEvents((s) => s.now);
  const { active, dismissed } = usePrefs((s) => s.event);
  return active ? null : suggestedEvent(events, new Date(now), dismissed);
}

export const useSortedEvents = () => {
  const events = useEvents((s) => s.events);
  const now = useEvents((s) => s.now);
  return sortEvents(events, new Date(now));
};

// Turning a mode on plays its opening animation the first time.
export function turnOn(id: string): void {
  const { introSeen } = usePrefs.getState().event;
  setEventPrefs({ active: id, introSeen: introSeen.includes(id) ? introSeen : [...introSeen, id] });
  if (!introSeen.includes(id)) useEvents.setState({ intro: id });
}

export const turnOff = () => setEventPrefs({ active: null });

export function dismiss(id: string): void {
  const { dismissed } = usePrefs.getState().event;
  if (!dismissed.includes(id)) setEventPrefs({ dismissed: [...dismissed, id] });
}

export const setCountry = (country: string) => setEventPrefs({ country });
export const setSnow = (snow: number) => setEventPrefs({ snow });

export { toggleReminder } from './reminders';
