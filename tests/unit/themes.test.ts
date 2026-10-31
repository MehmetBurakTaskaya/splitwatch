import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, hslToHex, mix } from '../../src/shared/color';
import en from '../../src/renderer/i18n/locales/en.json';
import { validatePreset } from '../../src/shared/presets';
import { PROTECTED_WORDS } from '../../src/shared/protected-words';
import {
  type Theme,
  MAX_CUSTOM_THEMES,
  NEUTRAL_THEME,
  contrastIssues,
  contrastProblems,
  ownTheme,
  pickTheme,
  sanitizeCustomThemes,
  themeFile,
  themeSlug,
  themeForSport,
  validateTheme,
} from '../../src/shared/themes';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const files = readdirSync('themes').filter((f) => f.endsWith('.json') && f !== 'schema.json');
const themes = files.map((f) => validateTheme(read(`themes/${f}`))!);
const presetSports = readdirSync('presets')
  .filter((f) => f !== 'index.json' && f !== 'schema.json')
  .map((f) => validatePreset(read(`presets/${f}`))!.sport);

describe('the shipped themes', () => {
  it.each(files)('%s is valid and named after its id', (file) => {
    const theme = validateTheme(read(`themes/${file}`));
    expect(theme).not.toBeNull();
    expect(`${theme!.id}.json`).toBe(file);
  });

  it('pass the contrast checks in light and dark', () => {
    expect(themes.flatMap(contrastProblems)).toEqual([]);
  });

  it("keep each tile's accent visible on every theme's surfaces", () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const a of themes) {
        for (const b of themes) {
          expect(
            contrast(a[scheme].ui.accent, b[scheme].ui.surface),
            `${a.id} on ${b.id} (${scheme})`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('give each sport one theme at most, and only sports that have presets', () => {
    const sports = themes.flatMap((t) => t.sports);
    expect(new Set(sports).size).toBe(sports.length);
    expect(sports.every((s) => presetSports.includes(s))).toBe(true);
  });

  it('are twelve sport themes and the neutral one', () => {
    expect(themes.filter((t) => t.id !== NEUTRAL_THEME && t.sports.length > 0)).toHaveLength(12);
    expect(themes.find((t) => t.id === NEUTRAL_THEME)?.sports).toEqual([]);
  });

  it('leave no preset sport without an icon', () => {
    const icons = readFileSync('src/renderer/components/sport-icons.tsx', 'utf8');
    for (const sport of presetSports) expect(icons, sport).toMatch(new RegExp(`^  '?${sport}'?: \\(`, 'm'));
  });

  it('all have a name in the English messages', () => {
    const names = en.themes as Record<string, string>;
    for (const theme of themes) expect(names[theme.id], theme.id).toBeTruthy();
  });

  it('match tokens.css in the neutral theme, which paints the window before the theme engine runs', () => {
    const css = readFileSync('src/renderer/styles/tokens.css', 'utf8');
    const [light, dark] = css.split('@media (prefers-color-scheme: dark)') as [string, string];
    const neutral = themes.find((t) => t.id === NEUTRAL_THEME)!;
    const vars = {
      bg: 'bg',
      surface: 'surface',
      text: 'text',
      muted: 'text-muted',
      border: 'border',
      accent: 'accent',
      accentStrong: 'accent-strong',
      onAccent: 'on-accent',
      accentSoft: 'accent-soft',
    } as const;
    for (const [role, name] of Object.entries(vars)) {
      const value = (block: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`).exec(block)?.[1];
      expect(value(light), role).toBe(neutral.light.ui[role as keyof typeof vars]);
      expect(value(dark), role).toBe(neutral.dark.ui[role as keyof typeof vars]);
    }
  });
});

describe('theme validation', () => {
  const good = read('themes/pool.json');

  it('rejects unknown backdrops, fonts and bad colors', () => {
    expect(validateTheme({ ...good, backdrop: 'photo' })).toBeNull();
    expect(validateTheme({ ...good, font: 'comic' })).toBeNull();
    expect(validateTheme({ ...good, light: { ...good.light, ui: { ...good.light.ui, accent: 'red' } } })).toBeNull();
    expect(validateTheme({ ...good, dark: { ui: good.dark.ui } })).toBeNull();
    expect(validateTheme({ ...good, id: '../pool' })).toBeNull();
  });

  it('reports weak contrast', () => {
    const weak = validateTheme({ ...good, light: { ...good.light, ui: { ...good.light.ui, muted: '#c0c0c0' } } })!;
    expect(contrastProblems(weak).join('\n')).toMatch(/muted on bg/);
  });
});

describe('theme choice', () => {
  const pool = themes.find((t) => t.id === 'pool')!;
  const sample: Theme[] = themes;

  it('follows the streams when they share a sport', () => {
    expect(pickTheme(sample, 'auto', ['swimming', 'swimming'], [])).toBe('pool');
    expect(pickTheme(sample, 'auto', ['swimming', null], [])).toBe('pool');
  });

  it('stays neutral for mixed, unknown or themeless sports', () => {
    expect(pickTheme(sample, 'auto', ['swimming', 'basketball'], [])).toBe(NEUTRAL_THEME);
    expect(pickTheme(sample, 'auto', [null, null], ['swimming'])).toBe(NEUTRAL_THEME);
    expect(pickTheme(sample, 'auto', ['wrestling'], [])).toBe(NEUTRAL_THEME);
  });

  it('uses the Live now sports when the grid is empty', () => {
    expect(pickTheme(sample, 'auto', [], ['basketball'])).toBe('hardwood');
    expect(pickTheme(sample, 'auto', [], [])).toBe(NEUTRAL_THEME);
    expect(pickTheme(sample, 'auto', [], ['basketball', 'swimming'])).toBe(NEUTRAL_THEME);
  });

  it('keeps a chosen theme, and falls back from an unknown one', () => {
    expect(pickTheme(sample, 'rink', ['swimming'], [])).toBe('rink');
    expect(pickTheme(sample, 'gone', [], [])).toBe(NEUTRAL_THEME);
  });

  it('finds the theme of a sport', () => {
    expect(themeForSport(sample, 'swimming')).toBe(pool);
    expect(themeForSport(sample, 'wrestling')).toBeUndefined();
    expect(themeForSport(sample, null)).toBeUndefined();
  });
});

describe('colors', () => {
  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBe(1);
  });

  it('converts and mixes', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 25)).toBe('#008000');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

// Words and marks of the organizers of the multi-sport Games stay out of the project, in every
// language (see CONTRIBUTING.md and src/shared/protected-words.ts).
describe('protected names', () => {
  it('never appear in the tracked files', () => {
    // New files count too, before their first commit.
    const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    const hits = tracked
      .filter((f) => /\.(ts|tsx|mjs|js|json|css|md|ya?ml|html|svg)$/.test(f))
      .filter((f) => {
        const text = readFileSync(f, 'utf8').toLowerCase();
        return PROTECTED_WORDS.some((word) => text.includes(word));
      });
    expect(hits).toEqual([]);
    // Reading every file can take a few seconds on a cold disk.
  }, 30_000);
});

describe('themes of your own', () => {
  const neutral = validateTheme(read('themes/neutral.json'))!;
  const mine = ownTheme(neutral, 'evening', 'Evening');

  it('carry a name of their own, and no sports or event', () => {
    expect(validateTheme({ ...mine, name: '  Evening  ' })?.name).toBe('Evening');
    expect(validateTheme({ ...mine, name: '' })).toBeNull();
    expect(validateTheme({ ...mine, name: 'x'.repeat(41) })).toBeNull();
    expect(validateTheme({ ...mine, name: 'Tab\there' })).toBeNull();
    const summer = validateTheme(read('themes/summer-games.json'))!;
    expect(ownTheme(summer, 'copy', 'Copy')).not.toHaveProperty('event');
    expect(ownTheme(validateTheme(read('themes/pool.json'))!, 'copy', 'Copy').sports).toEqual([]);
  });

  it('report each color pair that is hard to read', () => {
    expect(contrastIssues(mine)).toEqual([]);
    const pale = { ...mine, light: { ...mine.light, ui: { ...mine.light.ui, text: '#d0d0d0' } } };
    const issues = contrastIssues(pale);
    expect(issues.map((i) => `${i.scheme} ${i.fg} ${i.bg}`)).toEqual([
      'light text bg',
      'light text surface',
      'light text accentSoft',
    ]);
    expect(issues[0]!.min).toBe(4.5);
    expect(issues[0]!.ratio).toBeLessThan(4.5);
  });

  it('are kept only when valid and easy to read, each ID once, at most twenty', () => {
    const pale = { ...mine, id: 'pale', dark: { ...mine.dark, ui: { ...mine.dark.ui, muted: '#20242a' } } };
    const summer = read('themes/summer-games.json');
    const kept = sanitizeCustomThemes([mine, { ...mine, name: 'Again' }, pale, summer, { id: 'broken' }, 'text']);
    expect(kept).toEqual([mine]);
    const many = Array.from({ length: 30 }, (_, i) => ownTheme(neutral, `t${i}x`, `Theme ${i}`));
    expect(sanitizeCustomThemes(many)).toHaveLength(MAX_CUSTOM_THEMES);
    expect(sanitizeCustomThemes(null)).toEqual([]);
  });

  it('get an ID from their name that no theme has yet', () => {
    expect(themeSlug('Evening Glow', new Set())).toBe('evening-glow');
    expect(themeSlug('Gece Yarısı Şov', new Set())).toBe('gece-yarisi-sov');
    expect(themeSlug('Pool', new Set(['pool', 'pool-2']))).toBe('pool-3');
    expect(themeSlug('2024 !!', new Set())).toBe('theme');
    expect(themeSlug('✨', new Set(['theme']))).toBe('theme-2');
    expect(themeSlug('x'.repeat(60), new Set())).toHaveLength(36);
  });

  it('go to a file that reads back as the same theme', () => {
    const text = themeFile(mine);
    expect(text.endsWith('}\n')).toBe(true);
    const parsed = JSON.parse(text);
    expect(parsed.$schema).toMatch(/themes\/schema\.json$/);
    expect(validateTheme(parsed)).toEqual(mine);
  });
});
