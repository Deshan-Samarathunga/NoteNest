import { Storage } from 'megajs';

const { MEGA_EMAIL, MEGA_PASSWORD, MEGA_FOLDER_NAME = 'NoteNest' } = process.env;

if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn('MEGA credentials are missing. Set MEGA_EMAIL and MEGA_PASSWORD in .env');
}

export type MegaFolder = any;

export async function getMegaRoot() {
  const storage = await new Storage({
    email: MEGA_EMAIL || '',
    password: MEGA_PASSWORD || '',
    autologin: true,
  }).ready;
  return storage;
}

export async function ensureFolder(storage: Storage, folderName: string): Promise<MegaFolder> {
  const existing = storage.root?.children?.find((child) => child.name === folderName);
  if (existing) {
    return existing;
  }
  // target not typed on mkdir opts in @types, so cast
  const created = await storage.mkdir({ name: folderName, target: storage.root } as any);
  return created;
}
