import { Storage as MegaStorage } from 'megajs';
import { MegaCredentials } from '@/lib/auth/server';
import { ensureFolder, getMegaFolderName, getMegaStorage, MegaFile } from '@/lib/mega/client';
import { maybeDecrypt, maybeEncrypt } from '@/lib/storage/cryptoHelper';
import { IndexEntry, IndexFile, Label, NotePayload } from '@/lib/sync/types';

const INDEX_FILE = 'index.json';
const NOTES_FOLDER = 'notes';
const LABELS_FILE = 'labels.json';
const ATTACHMENTS_FOLDER = 'attachments';

type VersionExtractor<T> = (value: T) => number | undefined;

function extensionFromMime(mime?: string | null, originalName?: string) {
  // Prefer the original file extension when available.
  if (originalName) {
    const dot = originalName.lastIndexOf('.');
    if (dot >= 0) return originalName.slice(dot);
  }
  if (!mime) return '.bin';
  // Images
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('heic')) return '.heic';
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('bmp')) return '.bmp';
  if (mime.includes('ico') || mime.includes('icon')) return '.ico';
  // Video
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('ogg') && mime.includes('video')) return '.ogv';
  if (mime.includes('quicktime') || mime.includes('mov')) return '.mov';
  if (mime.includes('avi') || mime.includes('x-msvideo')) return '.avi';
  if (mime.includes('matroska') || mime.includes('mkv')) return '.mkv';
  // Audio
  if (mime.includes('mpeg') && mime.includes('audio')) return '.mp3';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('flac')) return '.flac';
  if (mime.includes('aac')) return '.aac';
  if (mime.includes('m4a') || (mime.includes('mp4') && mime.includes('audio'))) return '.m4a';
  // Documents
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('zip')) return '.zip';
  if (mime.includes('gzip') || mime.includes('gz')) return '.gz';
  if (mime.includes('x-tar')) return '.tar';
  if (mime.includes('x-7z')) return '.7z';
  if (mime.includes('x-rar')) return '.rar';
  if (mime.includes('json')) return '.json';
  if (mime.includes('xml')) return '.xml';
  if (mime.includes('csv')) return '.csv';
  if (mime.includes('plain')) return '.txt';
  if (mime.includes('html')) return '.html';
  if (mime.includes('javascript')) return '.js';
  if (mime.includes('msword') || mime.includes('wordprocessing')) return '.docx';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '.xlsx';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '.pptx';
  return '.bin';
}

function getFileTimestamp(file: MegaFile): number {
  const ts = Number(file?.timestamp ?? file?.createdAt ?? 0);
  return Number.isFinite(ts) ? ts : 0;
}

function toVersion(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function findFilesByName(folder: MegaStorage['root'] | MegaFile, name: string): MegaFile[] {
  return ((folder as any)?.children ?? []).filter((child: MegaFile) => child?.name === name);
}

async function deleteFile(file: MegaFile) {
  if (!file || typeof file.delete !== 'function') return;
  try {
    await file.delete(true);
  } catch {
    // Best-effort cleanup only.
  }
}

async function pruneNamedFiles(folder: MegaStorage['root'] | MegaFile, name: string, keepNodeId?: string) {
  if (!keepNodeId) return;
  const stale = findFilesByName(folder, name).filter((file) => file?.nodeId !== keepNodeId);
  await Promise.all(stale.map(deleteFile));
}

async function readJsonFile<T>(
  folder: MegaStorage['root'] | MegaFile,
  name: string,
  getVersion?: VersionExtractor<T>
): Promise<T | null> {
  const matches = findFilesByName(folder, name);
  if (!matches.length) return null;

  let selected: { file: MegaFile; value: T; version: number } | null = null;
  for (const file of matches) {
    try {
      const buf = await file.downloadBuffer();
      const value = JSON.parse(buf.toString('utf-8')) as T;
      const version = toVersion(getVersion?.(value), getFileTimestamp(file));
      if (!selected || version > selected.version) {
        selected = { file, value, version };
      }
    } catch {
      // Ignore malformed duplicates.
    }
  }

  if (!selected) return null;
  if (matches.length > 1) {
    const stale = matches.filter((file) => file?.nodeId !== selected?.file?.nodeId);
    await Promise.all(stale.map(deleteFile));
  }
  return selected.value;
}

async function writeJsonFile(folder: MegaFile, name: string, data: unknown) {
  const json = Buffer.from(JSON.stringify(data, null, 2));
  const upload = folder.upload({ name, allowUploadBuffer: true, target: folder }, json);
  const created = await upload.complete;
  await pruneNamedFiles(folder, name, created?.nodeId);
}

function unwrapMaybeEncrypted<T>(payload: unknown, passphrase?: string): T {
  if (payload && typeof payload === 'object' && 'ciphertext' in payload) {
    return maybeDecrypt<T>(payload, passphrase);
  }
  return payload as T;
}

function wrapMaybeEncrypted<T>(payload: T, passphrase?: string) {
  return maybeEncrypt(payload, passphrase);
}

export class MegaNoteStorage {
  private readonly email: string;
  private readonly password: string;
  private storage: MegaStorage | null = null;
  private appFolder: MegaFile | null = null;
  private notesFolder: MegaFile | null = null;
  private attachmentsFolder: MegaFile | null = null;
  private labelsCache: Label[] | null = null;

  constructor(creds: MegaCredentials) {
    this.email = creds.email;
    this.password = creds.password;
  }

  private async init() {
    if (this.storage && this.appFolder && this.notesFolder && this.attachmentsFolder) return;
    const storage = await getMegaStorage(this.email, this.password);
    const folderName = getMegaFolderName();
    this.appFolder = await ensureFolder(storage, folderName);
    this.notesFolder = await ensureFolder(storage, `${folderName}-${NOTES_FOLDER}`);
    this.attachmentsFolder = await ensureFolder(storage, `${folderName}-${ATTACHMENTS_FOLDER}`);
    this.storage = storage;
  }

  async getIndex(passphrase?: string): Promise<IndexFile> {
    await this.init();
    if (!this.appFolder) throw new Error('mega_folder_unavailable');
    const existingRaw = await readJsonFile<IndexFile | any>(
      this.appFolder,
      INDEX_FILE,
      (payload: any) =>
        typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt) ? payload.updatedAt : undefined
    );
    if (existingRaw) return unwrapMaybeEncrypted<IndexFile>(existingRaw, passphrase);
    const empty: IndexFile = { updatedAt: 0, notes: [] };
    await writeJsonFile(this.appFolder, INDEX_FILE, wrapMaybeEncrypted(empty, passphrase));
    return empty;
  }

  private async saveIndex(index: IndexFile, passphrase?: string) {
    if (!this.appFolder) throw new Error('mega_folder_unavailable');
    await writeJsonFile(this.appFolder, INDEX_FILE, wrapMaybeEncrypted(index, passphrase));
  }

  private findIndexEntry(index: IndexFile, id: string): IndexEntry | undefined {
    return index.notes.find((note) => note.id === id);
  }

  async getLabels(passphrase?: string): Promise<Label[]> {
    await this.init();
    if (this.labelsCache) return this.labelsCache;
    if (!this.appFolder) throw new Error('mega_folder_unavailable');
    const labelsRaw =
      (await readJsonFile<Label[] | any>(this.appFolder, LABELS_FILE, (payload: any) => {
        if (Array.isArray(payload)) {
          return payload.reduce((max, label) => Math.max(max, Number(label?.updatedAt ?? 0)), 0);
        }
        return typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt)
          ? payload.updatedAt
          : undefined;
      })) ?? [];
    const labels = unwrapMaybeEncrypted<Label[]>(labelsRaw, passphrase) ?? [];
    this.labelsCache = labels;
    return labels;
  }

  private async saveLabels(labels: Label[], passphrase?: string) {
    if (!this.appFolder) throw new Error('mega_folder_unavailable');
    await writeJsonFile(this.appFolder, LABELS_FILE, wrapMaybeEncrypted(labels, passphrase));
    this.labelsCache = labels;
  }

  async upsertLabel(label: Label, passphrase?: string) {
    const labels = await this.getLabels(passphrase);
    const existing = labels.find((item) => item.id === label.id);
    if (existing) {
      if (existing.updatedAt > label.updatedAt) return;
      existing.name = label.name;
      existing.updatedAt = label.updatedAt;
    } else {
      labels.push(label);
    }
    await this.saveLabels(labels, passphrase);
  }

  async deleteLabel(id: string, passphrase?: string) {
    const labels = await this.getLabels(passphrase);
    await this.saveLabels(labels.filter((label) => label.id !== id), passphrase);
  }

  async readNote(id: string, passphrase?: string): Promise<NotePayload | null> {
    await this.init();
    if (!this.notesFolder) throw new Error('mega_folder_unavailable');
    const raw = await readJsonFile<NotePayload | any>(
      this.notesFolder,
      `NOTE_${id}.json`,
      (payload: any) =>
        typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt) ? payload.updatedAt : undefined
    );
    return raw ? unwrapMaybeEncrypted<NotePayload>(raw, passphrase) : null;
  }

  async readActiveNote(id: string, passphrase?: string): Promise<NotePayload | null> {
    const index = await this.getIndex(passphrase);
    const entry = this.findIndexEntry(index, id);
    if (entry?.deleted) return null;
    return this.readNote(id, passphrase);
  }

  async writeNote(note: NotePayload, passphrase?: string): Promise<void> {
    await this.init();
    if (!this.notesFolder) throw new Error('mega_folder_unavailable');
    await writeJsonFile(this.notesFolder, `NOTE_${note.id}.json`, wrapMaybeEncrypted(note, passphrase));
  }

  async uploadAttachment(id: string, buffer: Buffer, mimeType?: string | null, originalName?: string) {
    await this.init();
    if (!this.attachmentsFolder) throw new Error('mega_folder_unavailable');
    let name = `ATT_${id}${extensionFromMime(mimeType, originalName)}`;
    if (originalName) {
      const extIndex = originalName.lastIndexOf('.');
      if (extIndex > 0) {
        const base = originalName.slice(0, extIndex);
        const ext = originalName.slice(extIndex);
        name = `${base}_${id}${ext}`;
      } else {
        name = `${originalName}_${id}${extensionFromMime(mimeType, originalName)}`;
      }
    }
    const upload = this.attachmentsFolder.upload({ name, allowUploadBuffer: true, target: this.attachmentsFolder }, buffer);
    const created = await upload.complete;
    await pruneNamedFiles(this.attachmentsFolder, name, created?.nodeId);
  }

  async getStorageQuota(): Promise<{ spaceUsed: number; spaceTotal: number; spaceFree: number }> {
    await this.init();
    if (!this.storage) throw new Error('mega_folder_unavailable');
    const info = await (this.storage as any).getAccountInfo();
    const spaceUsed = Number(info?.spaceUsed ?? 0);
    const spaceTotal = Number(info?.spaceTotal ?? 0);
    return { spaceUsed, spaceTotal, spaceFree: Math.max(0, spaceTotal - spaceUsed) };
  }

  private async findAttachmentFile(id: string): Promise<MegaFile | null> {
    await this.init();
    if (!this.attachmentsFolder) throw new Error('mega_folder_unavailable');
    return this.attachmentsFolder.children?.find((child: MegaFile) => child.name?.includes(id)) ?? null;
  }

  async downloadAttachment(id: string) {
    const file = await this.findAttachmentFile(id);
    if (!file) return null;
    const buffer = await file.downloadBuffer();
    return { buffer, name: file.name as string };
  }

  async syncPush(notes: NotePayload[], passphrase?: string) {
    const index = await this.getIndex(passphrase);
    const now = Date.now();

    for (const note of notes) {
      const entry = this.findIndexEntry(index, note.id);
      if (entry && entry.updatedAt > note.updatedAt) continue;

      const updatedEntry: IndexEntry = { id: note.id, updatedAt: note.updatedAt, deleted: note.deleted };
      if (entry) Object.assign(entry, updatedEntry);
      else index.notes.push(updatedEntry);

      if (!note.deleted) await this.writeNote(note, passphrase);
    }

    index.updatedAt = now;
    await this.saveIndex(index, passphrase);
    return { serverTime: now };
  }

  async syncPull(since: number, passphrase?: string) {
    const index = await this.getIndex(passphrase);
    const changedEntries = index.notes.filter((note) => note.updatedAt > since);
    const notes: NotePayload[] = [];

    for (const entry of changedEntries) {
      if (entry.deleted) {
        notes.push({ id: entry.id, updatedAt: entry.updatedAt, deleted: true });
        continue;
      }
      const note = await this.readNote(entry.id, passphrase);
      if (note) notes.push(note);
    }

    return { notes, serverTime: Date.now() };
  }
}

// One storage instance per MEGA account, so folder handles and the labels cache
// are reused across requests for the same logged-in user.
const noteStorageInstances = new Map<string, MegaNoteStorage>();

export function getNoteStorage(creds: MegaCredentials): MegaNoteStorage {
  const key = creds.email.trim().toLowerCase();
  let instance = noteStorageInstances.get(key);
  if (!instance) {
    instance = new MegaNoteStorage(creds);
    noteStorageInstances.set(key, instance);
  }
  return instance;
}
