import { create } from 'zustand';
import { withAlpha } from '../../shared/color';
import {
  type EventKind,
  NEUTRAL_THEME,
  type Scheme,
  type Theme,
  type UiRole,
  pickTheme,
  validateTheme,
} from '../../shared/themes';
import { activeEvent, useEvents } from '../state/events';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { displayFontFamily } from './fonts';

// The theme files in themes/, bundled at build time. An invalid file is left out.
const files = import.meta.glob<unknown>(['../../../themes/*.json', '!../../../themes/schema.json'], {
  eager: true,
  import: 'default',
});
export const THEMES: readonly Theme[] = Object.values(files)
  .map(validateTheme)
  .filter((t): t is Theme => t !== null)
  .sort((a, b) => (a.id === NEUTRAL_THEME ? -1 : b.id === NEUTRAL_THEME ? 1 : a.id.localeCompare(b.id)));

// The app's themes and the user's own (an own theme never takes an app theme's ID).
export function allThemes(): readonly Theme[] {
  const own = usePrefs.getState().customThemes;
  return own.length ? [...THEMES, ...own.filter((c) => !THEMES.some((t) => t.id === c.id))] : THEMES;
}

export const themeById = (id: string): Theme =>
  allThemes().find((t) => t.id === id) ?? THEMES.find((t) => t.id === NEUTRAL_THEME)!;

const CSS_VARS: Record<UiRole, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  muted: '--color-text-muted',
  border: '--color-border',
  accent: '--color-accent',
  accentStrong: '--color-accent-strong',
  onAccent: '--color-on-accent',
  accentSoft: '--color-accent-soft',
};

interface ThemeState {
  theme: Theme;
  scheme: Scheme;
  reducedMotion: boolean;
}

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

export const useTheme = create<ThemeState>(() => ({
  theme: themeById(NEUTRAL_THEME),
  scheme: darkQuery.matches ? 'dark' : 'light',
  reducedMotion: motionQuery.matches,
}));

// The sport of a stream: the one it came with or was given by hand, else the one the app found.
export function streamSport(videoId: string): string | null {
  const own = useSession.getState().sports[videoId];
  if (own) return own === 'none' ? null : own;
  return useYouTube.getState().streamSports[videoId] ?? null;
}

function apply(): void {
  const { theme, scheme } = useTheme.getState();
  const palette = theme[scheme];
  const style = document.documentElement.style;
  for (const [role, name] of Object.entries(CSS_VARS)) style.setProperty(name, palette.ui[role as UiRole]);
  style.setProperty('--color-hover', withAlpha(palette.ui.text, scheme === 'dark' ? 0.07 : 0.06));
  const font = displayFontFamily(theme.font);
  if (font) style.setProperty('--font-display', font);
  else style.removeProperty('--font-display');
  document.documentElement.dataset.theme = theme.id;
}

// The kind of the event whose mode is on, if any.
export function activeEventKind(): EventKind | null {
  return activeEvent(useEvents.getState().events, usePrefs.getState().event.active)?.kind ?? null;
}

// The theme of an event mode, drawn as a frame over a sport's backdrop.
export const eventTheme = (kind: EventKind): Theme | undefined => THEMES.find((t) => t.event === kind);

// While the theme editor is open, the app shows the theme being edited and nothing else picks one.
let previewing = false;
const systemScheme = (): Scheme => (darkQuery.matches ? 'dark' : 'light');

function choose(): void {
  if (previewing) return;
  const { theme: choice, sports: liveSports } = usePrefs.getState();
  const event = activeEventKind();
  const id = pickTheme(allThemes(), choice, useSession.getState().streams.map(streamSport), liveSports, event);
  const theme = themeById(id);
  if (theme !== useTheme.getState().theme) useTheme.setState({ theme });
  if (event) document.documentElement.dataset.event = event;
  else delete document.documentElement.dataset.event;
}

// Picks the theme from the settings and the streams, follows the system's light or dark mode and
// its reduced-motion setting, and writes the colors into the page's CSS variables.
export function connectTheme(): void {
  darkQuery.addEventListener('change', () => {
    if (!previewing) useTheme.setState({ scheme: systemScheme() });
  });
  motionQuery.addEventListener('change', () => useTheme.setState({ reducedMotion: motionQuery.matches }));
  useTheme.subscribe((s, prev) => {
    if (s.theme !== prev.theme || s.scheme !== prev.scheme) apply();
  });
  const root = document.documentElement;
  usePrefs.subscribe((s, prev) => {
    if (
      s.theme !== prev.theme ||
      s.customThemes !== prev.customThemes ||
      s.sports !== prev.sports ||
      s.event.active !== prev.event.active
    ) {
      choose();
    }
    root.toggleAttribute('data-performance', s.performance);
    root.toggleAttribute('data-spoilers', s.spoilers);
  });
  root.toggleAttribute('data-performance', usePrefs.getState().performance);
  root.toggleAttribute('data-spoilers', usePrefs.getState().spoilers);
  useSession.subscribe((s, prev) => {
    if (s.streams !== prev.streams || s.sports !== prev.sports) choose();
  });
  useYouTube.subscribe((s, prev) => {
    if (s.streamSports !== prev.streamSports) choose();
  });
  useEvents.subscribe((s, prev) => {
    if (s.events !== prev.events) choose();
  });
  choose();
  apply();
}

// Shows a theme on the whole app, in one mode, while the theme editor is open; null goes back to the
// theme and the mode the app picks.
export function previewTheme(theme: Theme | null, scheme?: Scheme): void {
  previewing = theme !== null;
  if (theme) {
    useTheme.setState({ theme, ...(scheme ? { scheme } : {}) });
  } else {
    useTheme.setState({ scheme: systemScheme() });
    choose();
  }
}
