// Display fonts for headings, bundled with the app (SIL Open Font License 1.1; the license texts are
// in licenses/). Only Latin, Latin Extended (Turkish and the other European languages) and Cyrillic
// are bundled: other scripts fall back to the system font, letter by letter. A font is loaded the
// first time a theme asks for it.
import exoCyrillicExt from '@fontsource-variable/exo-2/files/exo-2-cyrillic-ext-wght-normal.woff2?url';
import exoCyrillic from '@fontsource-variable/exo-2/files/exo-2-cyrillic-wght-normal.woff2?url';
import exoLatinExt from '@fontsource-variable/exo-2/files/exo-2-latin-ext-wght-normal.woff2?url';
import exoLatin from '@fontsource-variable/exo-2/files/exo-2-latin-wght-normal.woff2?url';
import oswaldCyrillicExt from '@fontsource-variable/oswald/files/oswald-cyrillic-ext-wght-normal.woff2?url';
import oswaldCyrillic from '@fontsource-variable/oswald/files/oswald-cyrillic-wght-normal.woff2?url';
import oswaldLatinExt from '@fontsource-variable/oswald/files/oswald-latin-ext-wght-normal.woff2?url';
import oswaldLatin from '@fontsource-variable/oswald/files/oswald-latin-wght-normal.woff2?url';
import type { DisplayFont } from '../../shared/themes';

// Unicode ranges of the subsets, as Fontsource publishes them.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const CYRILLIC_EXT = 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F';

const FONTS: Record<DisplayFont, { family: string; files: [string, string][] }> = {
  oswald: {
    family: 'Oswald Variable',
    files: [
      [oswaldLatin, LATIN],
      [oswaldLatinExt, LATIN_EXT],
      [oswaldCyrillic, CYRILLIC],
      [oswaldCyrillicExt, CYRILLIC_EXT],
    ],
  },
  exo2: {
    family: 'Exo 2 Variable',
    files: [
      [exoLatin, LATIN],
      [exoLatinExt, LATIN_EXT],
      [exoCyrillic, CYRILLIC],
      [exoCyrillicExt, CYRILLIC_EXT],
    ],
  },
};

const loaded = new Set<DisplayFont>();

// Returns the CSS font-family list for headings, registering the font on first use.
export function displayFontFamily(font: DisplayFont | null): string | null {
  if (!font) return null;
  const { family, files } = FONTS[font];
  if (!loaded.has(font)) {
    loaded.add(font);
    for (const [url, unicodeRange] of files) {
      document.fonts.add(new FontFace(family, `url(${url}) format('woff2')`, { weight: '200 700', unicodeRange }));
    }
  }
  return `'${family}', var(--font-ui)`;
}
