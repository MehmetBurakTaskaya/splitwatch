// Themes are JSON files in themes/ (see themes/schema.json and CONTRIBUTING.md): interface colors and
// a drawn background for light and dark, and the sports they belong to. Everything here is pure, so
// the unit tests can check every theme file.
import { contrast, isHexColor } from './color';

export const UI_ROLES = [
  'bg',
  'surface',
  'text',
  'muted',
  'border',
  'accent',
  'accentStrong',
  'onAccent',
  'accentSoft',
] as const;
export type UiRole = (typeof UI_ROLES)[number];

// The background's colors. What each one paints depends on the backdrop (see the backdrop's file).
export const SCENE_ROLES = ['base', 'line', 'accent', 'accent2', 'glow'] as const;
export type SceneRole = (typeof SCENE_ROLES)[number];

export const BACKDROPS = [
  'stripes',
  'pool',
  'track',
  'transition',
  'ridges',
  'contours',
  'court',
  'beach',
  'hardwood',
  'swell',
  'rink',
  'slalom',
  'halfpipe',
] as const;
export type BackdropKind = (typeof BACKDROPS)[number];

export const DISPLAY_FONTS = ['oswald', 'exo2'] as const;
export type DisplayFont = (typeof DISPLAY_FONTS)[number];

export interface Palette {
  ui: Record<UiRole, string>;
  scene: Record<SceneRole, string>;
}

export interface Theme {
  id: string;
  sports: string[];
  backdrop: BackdropKind;
  font: DisplayFont | null;
  light: Palette;
  dark: Palette;
}

export const NEUTRAL_THEME = 'neutral';
export type ThemeChoice = 'auto' | string;
export type Scheme = 'light' | 'dark';

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

function readRoles<T extends string>(raw: unknown, roles: readonly T[]): Record<T, string> | null {
  if (!isRecord(raw)) return null;
  const out = {} as Record<T, string>;
  for (const role of roles) {
    const value = raw[role];
    if (!isHexColor(value)) return null;
    out[role] = value.toLowerCase();
  }
  return out;
}

function readPalette(raw: unknown): Palette | null {
  if (!isRecord(raw)) return null;
  const ui = readRoles(raw.ui, UI_ROLES);
  const scene = readRoles(raw.scene, SCENE_ROLES);
  return ui && scene ? { ui, scene } : null;
}

// Returns the theme, or null when anything in it is invalid.
export function validateTheme(raw: unknown): Theme | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !SLUG.test(raw.id)) return null;
  if (!Array.isArray(raw.sports) || raw.sports.length > 10) return null;
  if (!raw.sports.every((s) => typeof s === 'string' && SLUG.test(s))) return null;
  if (!oneOf(BACKDROPS, raw.backdrop)) return null;
  if (raw.font !== null && !oneOf(DISPLAY_FONTS, raw.font)) return null;
  const light = readPalette(raw.light);
  const dark = readPalette(raw.dark);
  if (!light || !dark) return null;
  return { id: raw.id, sports: raw.sports as string[], backdrop: raw.backdrop, font: raw.font, light, dark };
}

// WCAG 2.1 AA: 4.5:1 for text, 3:1 for the accent where it marks a control or the focus.
export const CONTRAST_RULES: readonly [UiRole, UiRole, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'accentSoft', 4.5],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['onAccent', 'accentStrong', 4.5],
  ['accent', 'bg', 3],
  ['accent', 'surface', 3],
  ['accentStrong', 'surface', 3],
];

export function contrastProblems(theme: Theme): string[] {
  const problems: string[] = [];
  for (const scheme of ['light', 'dark'] as const) {
    const ui = theme[scheme].ui;
    for (const [fg, bg, min] of CONTRAST_RULES) {
      const ratio = contrast(ui[fg], ui[bg]);
      if (ratio < min) problems.push(`${theme.id} ${scheme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    }
  }
  return problems;
}

export const themeForSport = (themes: readonly Theme[], sport: string | null | undefined): Theme | undefined =>
  sport ? themes.find((t) => t.id !== NEUTRAL_THEME && t.sports.includes(sport)) : undefined;

// The theme the app shows. "auto" follows the streams: when every stream with a known sport points to
// the same theme, that theme; mixed or unknown sports stay neutral (each tile then shows its own
// sport's color). With no streams, the sports picked for Live now decide in the same way.
export function pickTheme(
  themes: readonly Theme[],
  choice: ThemeChoice,
  streamSports: readonly (string | null)[],
  liveSports: readonly string[],
): string {
  if (choice !== 'auto') return themes.some((t) => t.id === choice) ? choice : NEUTRAL_THEME;
  const sports = streamSports.length ? streamSports.filter((s): s is string => s !== null) : liveSports;
  const ids = new Set(sports.map((s) => themeForSport(themes, s)?.id ?? NEUTRAL_THEME));
  return ids.size === 1 ? [...ids][0]! : NEUTRAL_THEME;
}
