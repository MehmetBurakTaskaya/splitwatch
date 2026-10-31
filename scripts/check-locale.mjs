// Checks a translation against the English source: the same keys, messages that parse as ICU
// MessageFormat in that language and format with sample values, the same arguments, and none of the
// words that stay out of the project (CONTRIBUTING.md). Usage: node scripts/check-locale.mjs <tag>
import { readFileSync } from 'node:fs';
import { IntlMessageFormat } from 'intl-messageformat';
import { PROTECTED_WORDS } from '../src/shared/protected-words.ts';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/check-locale.mjs <tag>, such as de or pt-BR');
  process.exit(2);
}
const read = (name) => JSON.parse(readFileSync(`src/renderer/i18n/locales/${name}.json`, 'utf8'));
const source = read('en');
const target = read(tag);
const problems = [];

function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out.set(path, value);
  }
  return out;
}

// The argument names in a message and how they are used (plural, number, date or plain).
function argumentsOf(ast, out = new Map()) {
  for (const el of ast) {
    if (el.type >= 1 && el.type <= 6)
      out.set(
        el.value,
        el.type === 6 ? 'plural' : el.type === 2 ? 'number' : el.type === 3 || el.type === 4 ? 'date' : 'plain',
      );
    if (el.options) for (const option of Object.values(el.options)) argumentsOf(option.value, out);
    if (el.children) argumentsOf(el.children, out);
  }
  return out;
}

const sampleValue = (kind) => (kind === 'plural' || kind === 'number' ? 3 : kind === 'date' ? new Date() : 'Sample');

const en = flatten(source);
const tr = flatten(target);
for (const key of en.keys()) if (!tr.has(key)) problems.push(`missing: ${key}`);
for (const key of tr.keys()) if (!en.has(key)) problems.push(`not in English: ${key}`);

for (const [key, message] of tr) {
  if (!en.has(key)) continue;
  if (typeof message !== 'string' || !message.trim()) {
    problems.push(`${key}: empty or not text`);
    continue;
  }
  let format;
  try {
    format = new IntlMessageFormat(message, tag);
  } catch (e) {
    problems.push(`${key}: does not parse (${e.message})`);
    continue;
  }
  const want = argumentsOf(new IntlMessageFormat(en.get(key), 'en').getAst());
  const have = argumentsOf(format.getAst());
  for (const name of want.keys()) if (!have.has(name)) problems.push(`${key}: lost {${name}}`);
  for (const name of have.keys()) if (!want.has(name)) problems.push(`${key}: unknown {${name}}`);
  const values = Object.fromEntries([...want].map(([name, kind]) => [name, sampleValue(kind)]));
  try {
    format.format(values);
  } catch (e) {
    problems.push(`${key}: does not format (${e.message})`);
  }
  const lower = message.toLowerCase();
  for (const word of PROTECTED_WORDS) if (lower.includes(word)) problems.push(`${key}: a protected word`);
}

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problem(s) in ${tag}.json`);
  process.exit(1);
}
console.log(`${tag}.json: ${tr.size} messages, all fine`);
