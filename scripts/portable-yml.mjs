// Writes latest-portable.yml for the portable Windows copy, which updates itself from the ZIP
// (src/main/updates.ts): the version, the file and its SHA-512 in base64, as in latest.yml.
//   node scripts/portable-yml.mjs Splitwatch-Portable-x64.zip > latest-portable.yml
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const data = readFileSync(file);
const sha512 = createHash('sha512').update(data).digest('base64');
process.stdout.write(`version: ${version}\npath: ${basename(file)}\nsha512: ${sha512}\nsize: ${data.length}\n`);
