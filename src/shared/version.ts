// Compares release versions such as "0.2.0" or "v1.0.0". Pre-release suffixes ("1.0.0-beta.1")
// rank below the release they precede.
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a.core[i]! !== b.core[i]!) return a.core[i]! > b.core[i]!;
  }
  if (a.pre === b.pre) return false;
  if (a.pre === null) return true;
  if (b.pre === null) return false;
  return a.pre.localeCompare(b.pre, 'en', { numeric: true }) > 0;
}

function parse(version: string): { core: [number, number, number]; pre: string | null } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version.trim());
  if (!m) return null;
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
}
