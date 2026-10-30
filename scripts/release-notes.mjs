// Prints the CHANGELOG.md section of one version, for the release notes: node scripts/release-notes.mjs 0.1.0
import { readFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) throw new Error('Usage: node scripts/release-notes.mjs <version>');

const out = [];
let inside = false;
for (const line of readFileSync('CHANGELOG.md', 'utf8').split('\n')) {
  if (line.startsWith(`## [${version}]`)) {
    inside = true;
    continue;
  }
  if (!inside) continue;
  if (line.startsWith('## [')) break;
  // Link definitions at the end of the file belong to the changelog, not to the release.
  if (/^\[[^\]]+\]: https?:\/\//.test(line)) continue;
  out.push(line);
}
const notes = out.join('\n').trim();
if (!notes) throw new Error(`CHANGELOG.md has no section for ${version}`);
console.log(notes);
