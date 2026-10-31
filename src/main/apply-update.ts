import { spawn } from 'node:child_process';
import { cpSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { PRODUCT_NAME } from '../shared/app';
import type { ApplyUpdate } from '../shared/updates';

// The portable Windows copy is updated by the new version itself: updates.ts starts the downloaded,
// checked Splitwatch.exe with --apply-update and closes. That copy opens no window and shows no
// console; it waits for the old app to close, copies its own folder over the old one (adding and
// replacing, never deleting, in case the folder holds anything else), and starts the app again if
// asked. It runs before index.ts sets anything up, so everything here is synchronous and ends the
// process.

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function running(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function applyUpdate(job: ApplyUpdate): never {
  // Its own settings folder, beside the download, so it never touches the user's.
  app.setPath('userData', path.join(path.dirname(job.from), 'helper'));
  for (let waited = 0; running(job.pid) && waited < 60_000; waited += 250) sleep(250);
  // The old app's last processes can hold its files for a moment after it has closed.
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      cpSync(job.from, job.to, { recursive: true, force: true });
      break;
    } catch {
      sleep(500);
    }
  }
  if (job.restart) {
    spawn(path.join(job.to, `${PRODUCT_NAME}.exe`), job.hidden ? ['--hidden'] : [], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  }
  process.exit(0);
}
