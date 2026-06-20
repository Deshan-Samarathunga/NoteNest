import { Storage } from 'megajs';
import { getOptionalEnv } from '@/lib/storage/env';

export type MegaFile = any;
export type MegaFolder = any;

// Reuse one live MEGA connection per account. MEGA login derives keys (expensive),
// so caching the ready Storage across requests avoids re-logging in every call.
const storageCache = new Map<string, Promise<Storage>>();

export function getMegaFolderName() {
  return getOptionalEnv('MEGA_FOLDER_NAME', 'NoteNest');
}

export async function getMegaStorage(email: string, password: string): Promise<Storage> {
  // Include password in the cache key so a different password forces a fresh login.
  const key = `${email.trim().toLowerCase()}:${password}`;
  let pending = storageCache.get(key);
  if (!pending) {
    pending = new Storage({ email, password, autologin: true }).ready;
    // Don't cache a failed login (e.g. wrong password) so retries can succeed.
    pending.catch(() => storageCache.delete(key));
    storageCache.set(key, pending);
  }
  try {
    return await pending;
  } catch (error) {
    storageCache.delete(key);
    throw error;
  }
}

export async function ensureFolder(storage: Storage, folderName: string): Promise<MegaFolder> {
  const existing = storage.root?.children?.find((child: MegaFile) => child.name === folderName);
  if (existing) return existing;
  return storage.mkdir({ name: folderName, target: storage.root } as any);
}
