import { Storage } from 'megajs';
import { getOptionalEnv, getRequiredEnv } from '@/lib/storage/env';

export type MegaFile = any;
export type MegaFolder = any;

let rootPromise: Promise<Storage> | null = null;

export function getMegaFolderName() {
  return getOptionalEnv('MEGA_FOLDER_NAME', 'NoteNest');
}

export async function getMegaRoot() {
  if (!rootPromise) {
    rootPromise = new Storage({
      email: getRequiredEnv('MEGA_EMAIL'),
      password: getRequiredEnv('MEGA_PASSWORD'),
      autologin: true
    }).ready;
  }
  return rootPromise;
}

export async function ensureFolder(storage: Storage, folderName: string): Promise<MegaFolder> {
  const existing = storage.root?.children?.find((child: MegaFile) => child.name === folderName);
  if (existing) return existing;
  return storage.mkdir({ name: folderName, target: storage.root } as any);
}
