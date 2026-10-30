import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app, safeStorage } from 'electron';

// The user's YouTube Data API key, encrypted with safeStorage: on macOS with a key kept in the
// Keychain, on Windows with DPAPI (bound to the Windows user account). Only the encrypted bytes
// touch the disk. Without a secure backend (some Linux desktops), no key is stored at all.
const file = () => path.join(app.getPath('userData'), 'youtube-api-key.bin');
let cached: string | null | undefined;

// Development and test runs only: a key from the environment, so tests never touch the Keychain.
const testKey = () => (!app.isPackaged ? process.env.SPLITWATCH_TEST_API_KEY : undefined);

export async function canStoreKey(): Promise<boolean> {
  if (testKey()) return true;
  try {
    return await safeStorage.isAsyncEncryptionAvailable();
  } catch {
    return false;
  }
}

export async function loadKey(): Promise<string | null> {
  const fromEnv = testKey();
  if (fromEnv) return fromEnv;
  if (cached !== undefined) return cached;
  try {
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(await readFile(file()));
    if (shouldReEncrypt) await writeFile(file(), await safeStorage.encryptStringAsync(result));
    cached = result || null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveKey(key: string): Promise<boolean> {
  if (testKey()) return true;
  if (!(await canStoreKey())) return false;
  await writeFile(file(), await safeStorage.encryptStringAsync(key));
  cached = key;
  return true;
}

export async function deleteKey(): Promise<void> {
  cached = null;
  await rm(file(), { force: true });
}
