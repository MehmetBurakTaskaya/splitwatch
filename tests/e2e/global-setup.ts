import { rmSync } from 'node:fs';
import { TEST_DATA } from './temp';

// Removes the folders the last run left behind.
export default function globalSetup(): void {
  rmSync(TEST_DATA, { recursive: true, force: true, maxRetries: 5 });
}
