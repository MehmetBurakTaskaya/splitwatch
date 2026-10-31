import { mkdirSync, mkdtempSync } from 'node:fs';
import path from 'node:path';

// The folders the tests make (settings, downloads, files to import) go under test-data in the
// project, which global-setup.ts empties before each run, so they never pile up in the system's
// temp folder.
export const TEST_DATA = path.resolve('test-data');

export function tempDir(prefix: string): string {
  mkdirSync(TEST_DATA, { recursive: true });
  return mkdtempSync(path.join(TEST_DATA, prefix));
}
