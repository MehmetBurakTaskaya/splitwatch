// Themes are JSON files in themes/ (see themes/schema.json and CONTRIBUTING.md): interface colors and
// a drawn background for light and dark, and the sports they belong to. The user's own themes have the
// same shape, with a name and no sports; they are kept in the settings and go in and out as files.
// Everything here is pure, so the unit tests can check every theme file.
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
  'stadium',
  'aurora',
] as const;
export type BackdropKind = (typeof BACKDROPS)[number];

export const DISPLAY_FONTS = ['oswald', 'exo2'] as const;
export type DisplayFont = (typeof DISPLAY_FONTS)[number];

export interface Palette {
  ui: Record<UiRole, string>;
  scene: Record<SceneRole, string>;
}

export type EventKind = 'summer' | 'winter';

export interface Theme {
  id: string;
  // The user's own themes are named by the user; the app's themes get their name from the language
  // files (themes.<id>).
  name?: string;
  // The Summer or Winter Games theme, shown only while that event mode is on.
  event?: EventKind;
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
export const MAX_THEME_NAME = 40;
// The most themes of the user's own.
export const MAX_CUSTOM_THEMES = 20;
// Where an exported theme file points for its schema, so that an editor can check it.
export const THEME_SCHEMA_URL =
  'https://raw.githubusercontent.com/MehmetBurakTaskaya/splitwatch/main/themes/schema.json';
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
  if (raw.event !== undefined && raw.event !== 'summer' && raw.event !== 'winter') return null;
  let name: string | undefined;
  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string') return null;
    name = raw.name.trim();
    // eslint-disable-next-line no-control-regex
    if (!name || name.length > MAX_THEME_NAME || /[\u0000-\u001f\u007f]/.test(name)) return null;
  }
  return {
    id: raw.id,
    ...(name ? { name } : {}),
    ...(raw.event ? { event: raw.event } : {}),
    sports: raw.sports as string[],
    backdrop: raw.backdrop,
    font: raw.font,
    light,
    dark,
  };
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

export interface ContrastIssue {
  scheme: Scheme;
  fg: UiRole;
  bg: UiRole;
  ratio: number;
  min: number;
}

export function contrastIssues(theme: Theme): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (const scheme of ['light', 'dark'] as const) {
    const ui = theme[scheme].ui;
    for (const [fg, bg, min] of CONTRAST_RULES) {
      const ratio = contrast(ui[fg], ui[bg]);
      if (ratio < min) issues.push({ scheme, fg, bg, ratio, min });
    }
  }
  return issues;
}

export const contrastProblems = (theme: Theme): string[] =>
  contrastIssues(theme).map(
    ({ scheme, fg, bg, ratio, min }) =>
      `${theme.id} ${scheme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
  );

// A theme of the user's own: a copy with a name, picked by hand only (no sports, no event).
export function ownTheme(theme: Theme, id: string, name: string): Theme {
  return { id, name, sports: [], backdrop: theme.backdrop, font: theme.font, light: theme.light, dark: theme.dark };
}

// The user's own themes from the settings: valid, easy to read, each ID once.
export function sanitizeCustomThemes(raw: unknown): Theme[] {
  if (!Array.isArray(raw)) return [];
  const out: Theme[] = [];
  for (const item of raw) {
    const theme = validateTheme(item);
    if (!theme || theme.event || contrastIssues(theme).length || out.some((t) => t.id === theme.id)) continue;
    out.push(ownTheme(theme, theme.id, theme.name ?? theme.id));
    if (out.length === MAX_CUSTOM_THEMES) break;
  }
  return out;
}

// An ID for a new theme from its name, not taken yet.
export function themeSlug(name: string, taken: ReadonlySet<string>): string {
  const ascii = name
    .toLocaleLowerCase('en')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+|-+$/g, '')
    .slice(0, 36)
    .replace(/-+$/, '');
  const base = SLUG.test(ascii) ? ascii : 'theme';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

// The file a theme is exported to.
export function themeFile(theme: Theme): string {
  const { id, name, event, sports, backdrop, font, light, dark } = theme;
  const file = {
    $schema: THEME_SCHEMA_URL,
    id,
    ...(name ? { name } : {}),
    ...(event ? { event } : {}),
    sports,
    backdrop,
    font,
    light,
    dark,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export const themeForSport = (themes: readonly Theme[], sport: string | null | undefined): Theme | undefined =>
  sport ? themes.find((t) => t.id !== NEUTRAL_THEME && t.sports.includes(sport)) : undefined;

// The theme the app shows. "auto" follows the streams: when every stream with a known sport points to
// the same theme, that theme; mixed or unknown sports stay neutral (each tile then shows its own
// sport's color). With no streams, the sports picked for Live now decide in the same way. While an
// event mode is on, its theme takes the neutral theme's place.
export function pickTheme(
  themes: readonly Theme[],
  choice: ThemeChoice,
  streamSports: readonly (string | null)[],
  liveSports: readonly string[],
  event: EventKind | null = null,
): string {
  const neutral = (event && themes.find((t) => t.event === event)?.id) || NEUTRAL_THEME;
  if (choice !== 'auto') {
    const chosen = themes.find((t) => t.id === choice && !t.event);
    return !chosen || chosen.id === NEUTRAL_THEME ? neutral : chosen.id;
  }
  const sports = streamSports.length ? streamSports.filter((s): s is string => s !== null) : liveSports;
  const ids = new Set(sports.map((s) => themeForSport(themes, s)?.id ?? neutral));
  return ids.size === 1 ? [...ids][0]! : neutral;
}
