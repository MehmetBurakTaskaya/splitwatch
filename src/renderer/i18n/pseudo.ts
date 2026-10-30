// Pseudo-locales for layout tests: en-XA makes every string about 40% longer and accented,
// ar-XB shows it right to left. Only the literal text of an ICU message changes; arguments,
// plural and select syntax stay intact.

export type PseudoLocale = 'en-XA' | 'ar-XB';

export function isPseudoLocale(locale: string): locale is PseudoLocale {
  return locale === 'en-XA' || locale === 'ar-XB';
}

const ACCENTED: Record<string, string> = Object.fromEntries(
  [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => [
    c,
    [...'áƀçðéƒĝĥíĵķĺɱñóþǫŕšţúṽŵẋýžÁƁÇÐÉƑĜĤÍĴĶĹṀÑÓÞǪŔŠŢÚṼŴẊÝŽ'][i]!,
  ]),
);

export function pseudoMessage(message: string, locale: PseudoLocale): string {
  let i = 0;
  const literal = (text: string) => (locale === 'en-XA' ? [...text].map((c) => ACCENTED[c] ?? c).join('') : text);

  // Reads text until the end, or until the closing brace of a plural or select branch.
  function readMessage(nested: boolean): string {
    let out = '';
    let text = '';
    const flush = () => {
      out += literal(text);
      text = '';
    };
    while (i < message.length) {
      const c = message[i]!;
      if (c === "'" && message[i + 1] === "'") {
        text += "''";
        i += 2;
      } else if (c === "'" && '{}#'.includes(message[i + 1] ?? '')) {
        // A quoted section of syntax characters stays as written.
        flush();
        const end = message.indexOf("'", i + 1);
        const stop = end < 0 ? message.length : end + 1;
        out += message.slice(i, stop);
        i = stop;
      } else if (c === '{') {
        flush();
        out += readArgument();
      } else if (c === '}' && nested) {
        break;
      } else if (c === '#' && nested) {
        flush();
        out += '#';
        i++;
      } else {
        text += c;
        i++;
      }
    }
    flush();
    return out;
  }

  // Reads one {argument}, starting at its opening brace.
  function readArgument(): string {
    const start = i;
    i++;
    while (i < message.length && message[i] !== ',' && message[i] !== '}') i++;
    if (message[i] === '}') return message.slice(start, ++i);
    const typeStart = ++i;
    while (i < message.length && message[i] !== ',' && message[i] !== '}') i++;
    const type = message.slice(typeStart, i).trim();
    if (type === 'plural' || type === 'select' || type === 'selectordinal') {
      let out = message.slice(start, i);
      while (i < message.length && message[i] !== '}') {
        if (message[i] === '{') {
          i++;
          out += `{${readMessage(true)}}`;
          i++;
        } else {
          out += message[i++];
        }
      }
      i++;
      return `${out}}`;
    }
    // number, date and time arguments: copy them up to their closing brace.
    let depth = 1;
    while (i < message.length && depth > 0) {
      if (message[i] === '{') depth++;
      else if (message[i] === '}') depth--;
      i++;
    }
    return message.slice(start, i);
  }

  const body = readMessage(false);
  if (locale === 'ar-XB') return `‮${body}‬`;
  return `[${body} ${'~'.repeat(Math.ceil(message.length * 0.4))}]`;
}

export function pseudoLocalize<T>(resources: T, locale: PseudoLocale): T {
  if (typeof resources === 'string') return pseudoMessage(resources, locale) as T;
  if (resources && typeof resources === 'object') {
    return Object.fromEntries(
      Object.entries(resources).map(([key, value]) => [key, pseudoLocalize(value, locale)]),
    ) as T;
  }
  return resources;
}
