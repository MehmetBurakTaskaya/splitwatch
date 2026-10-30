import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import {
  type QuotaBucket,
  type QuotaLedger,
  canSpend,
  currentLedger,
  markExhausted,
  nextReset,
  sanitizeLedger,
  spend,
} from '../shared/quota';
import { getSettings } from './settings-store';

// Counts the API usage of the current Pacific day in quota.json. The real quota lives in the user's
// Google Cloud project; this local count keeps the app well inside it.
let ledger: QuotaLedger | null = null;
const listeners = new Set<() => void>();

const file = () => path.join(app.getPath('userData'), 'quota.json');

function current(): QuotaLedger {
  if (!ledger) {
    try {
      ledger = sanitizeLedger(JSON.parse(readFileSync(file(), 'utf8')), new Date());
    } catch {
      ledger = sanitizeLedger(null, new Date());
    }
  }
  ledger = currentLedger(ledger, new Date());
  return ledger;
}

function save(next: QuotaLedger): void {
  ledger = next;
  try {
    writeFileSync(file(), JSON.stringify(next));
  } catch {
    // The count stays in memory; the next change tries again.
  }
  for (const listener of listeners) listener();
}

export function quotaSnapshot() {
  const l = current();
  return {
    used: { units: l.units, searches: l.searches },
    limits: getSettings().quotaLimits,
    exhausted: l.exhausted,
    resetsAt: nextReset(new Date()).toISOString(),
  };
}

export function trySpend(bucket: QuotaBucket, cost: number, background: boolean): boolean {
  const l = current();
  if (!canSpend(l, getSettings().quotaLimits, bucket, cost, background)) return false;
  save(spend(l, bucket, cost));
  return true;
}

export function reportExhausted(bucket: QuotaBucket): void {
  save(markExhausted(current(), bucket));
}

export function onQuotaChange(listener: () => void): void {
  listeners.add(listener);
}
