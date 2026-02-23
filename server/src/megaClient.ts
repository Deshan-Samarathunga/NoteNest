import { Storage } from 'megajs';
import { StorageUnavailableError } from './errors';

function getMegaCredentials() {
  const email = process.env.MEGA_EMAIL?.trim();
  const password = process.env.MEGA_PASSWORD?.trim();
  return { email, password };
}

const creds = getMegaCredentials();
if (!creds.email || !creds.password) {
  // eslint-disable-next-line no-console
  console.warn('MEGA credentials are missing. Set MEGA_EMAIL and MEGA_PASSWORD in .env');
}

export type MegaFolder = any;

export async function getMegaRoot() {
  const { email, password } = getMegaCredentials();
  if (!email || !password) {
    throw new StorageUnavailableError('MEGA credentials are not configured');
  }
  try {
    const storage = await new Storage({
      email,
      password,
      autologin: true,
    }).ready;
    return storage;
  } catch (err) {
    throw new StorageUnavailableError('MEGA storage is unavailable', err);
  }
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
