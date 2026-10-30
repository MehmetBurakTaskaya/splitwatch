import { create } from 'zustand';
import { withAlpha } from '../../shared/color';
import { NEUTRAL_THEME, type Scheme, type Theme, type UiRole, pickTheme, validateTheme } from '../../shared/themes';
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

export const themeById = (id: string): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === NEUTRAL_THEME)!;

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

function choose(): void {
  const { theme: choice, sports: liveSports } = usePrefs.getState();
  const id = pickTheme(THEMES, choice, useSession.getState().streams.map(streamSport), liveSports);
  if (id !== useTheme.getState().theme.id) useTheme.setState({ theme: themeById(id) });
}

// Picks the theme from the settings and the streams, follows the system's light or dark mode and
// its reduced-motion setting, and writes the colors into the page's CSS variables.
export function connectTheme(): void {
  darkQuery.addEventListener('change', () => useTheme.setState({ scheme: darkQuery.matches ? 'dark' : 'light' }));
  motionQuery.addEventListener('change', () => useTheme.setState({ reducedMotion: motionQuery.matches }));
  useTheme.subscribe((s, prev) => {
    if (s.theme !== prev.theme || s.scheme !== prev.scheme) apply();
  });
  const root = document.documentElement;
  usePrefs.subscribe((s, prev) => {
    if (s.theme !== prev.theme || s.sports !== prev.sports) choose();
    root.toggleAttribute('data-performance', s.performance);
  });
  root.toggleAttribute('data-performance', usePrefs.getState().performance);
  useSession.subscribe((s, prev) => {
    if (s.streams !== prev.streams || s.sports !== prev.sports) choose();
  });
  useYouTube.subscribe((s, prev) => {
    if (s.streamSports !== prev.streamSports) choose();
  });
  choose();
  apply();
}
