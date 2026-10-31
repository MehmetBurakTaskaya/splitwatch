import { readFileSync } from 'node:fs';
import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import en from '../../src/renderer/i18n/locales/en.json';
import { LANGUAGE_NAMES, SUPPORTED_LOCALES } from '../../src/shared/locales';
import { PROTECTED_WORDS } from '../../src/shared/protected-words';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = '', out = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else flatten(value, path, out);
  }
  return out;
}

// The argument names of a message, with how each is used.
type Element = { type: number; value?: string; options?: Record<string, { value: Element[] }>; children?: Element[] };
function argumentsOf(elements: Element[], out = new Map<string, string>()): Map<string, string> {
  for (const el of elements) {
    if (el.type >= 1 && el.type <= 6 && el.value) {
      out.set(
        el.value,
        el.type === 6 ? 'plural' : el.type === 2 ? 'number' : el.type === 3 || el.type === 4 ? 'date' : 'plain',
      );
    }
    if (el.options) for (const option of Object.values(el.options)) argumentsOf(option.value, out);
    if (el.children) argumentsOf(el.children, out);
  }
  return out;
}
const astOf = (message: string, locale: string) => new IntlMessageFormat(message, locale).getAst() as Element[];
const sample = (kind: string) => (kind === 'plural' || kind === 'number' ? 3 : kind === 'date' ? new Date() : 'Sample');

const source = flatten(en as Tree);
const translations = SUPPORTED_LOCALES.filter((tag) => tag !== 'en');

describe.each(translations)('the %s translation', (tag) => {
  const messages = flatten(JSON.parse(readFileSync(`src/renderer/i18n/locales/${tag}.json`, 'utf8')) as Tree);

  it('has every English message and no other', () => {
    expect([...messages.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it('keeps the arguments, parses and formats every message', () => {
    for (const [key, message] of messages) {
      const want = argumentsOf(astOf(source.get(key)!, 'en'));
      const have = argumentsOf(astOf(message, tag));
      expect([...have.keys()].sort(), key).toEqual([...want.keys()].sort());
      const values = Object.fromEntries([...want].map(([name, kind]) => [name, sample(kind)]));
      expect(() => new IntlMessageFormat(message, tag).format(values), key).not.toThrow();
    }
  });

  it('uses none of the protected words', () => {
    const hits = [...messages].filter(([, m]) => PROTECTED_WORDS.some((w) => m.toLowerCase().includes(w)));
    expect(hits.map(([key]) => key)).toEqual([]);
  });

  it('is named in its own language', () => {
    expect(LANGUAGE_NAMES[tag]).toBeTruthy();
  });
});
