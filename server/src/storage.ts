import { Storage as MegaStorage } from 'megajs';

import { ensureFolder, getMegaRoot } from './megaClient';
import { maybeDecrypt, maybeEncrypt } from './cryptoHelper';
import { IndexEntry, IndexFile, Label, NotePayload } from './types';

type MegaFile = any;
type VersionExtractor<T> = (value: T) => number | undefined;

const INDEX_FILE = 'index.json';
const NOTES_FOLDER = 'notes';
const LABELS_FILE = 'labels.json';
const ATTACHMENTS_FOLDER = 'attachments';

function extensionFromMime(mime?: string | null) {
  if (!mime) return '.bin';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('heic')) return '.heic';
  return '.bin';
}

function getFileTimestamp(file: MegaFile): number {
  const ts = Number(file?.timestamp ?? file?.createdAt ?? 0);
  return Number.isFinite(ts) ? ts : 0;
}

function toVersion(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function findFilesByName(folder: MegaStorage['root'] | MegaFile, name: string): MegaFile[] {
  return ((folder as any)?.children ?? []).filter((c: any) => c?.name === name);
}

async function deleteFile(file: MegaFile) {
  if (!file || typeof file.delete !== 'function') return;
  try {
    await file.delete(true);
  } catch {
    // best-effort cleanup only
  }
}

async function pruneNamedFiles(folder: MegaStorage['root'] | MegaFile, name: string, keepNodeId?: string) {
  if (!keepNodeId) return;
  const matches = findFilesByName(folder, name);
  const stale = matches.filter((f) => f?.nodeId !== keepNodeId);
  await Promise.all(stale.map((f) => deleteFile(f)));
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
      // ignore malformed duplicates and keep searching
    }
  }

  if (!selected) return null;
  if (matches.length > 1) {
    const stale = matches.filter((f) => f?.nodeId !== selected?.file?.nodeId);
    await Promise.all(stale.map((f) => deleteFile(f)));
  }
  return selected.value;
}

async function writeJsonFile(folder: MegaFile, name: string, data: unknown) {
  const json = Buffer.from(JSON.stringify(data, null, 2));
  const upload = folder.upload({ name, allowUploadBuffer: true, target: folder }, json);
  const created = await upload.complete;
  await pruneNamedFiles(folder, name, created?.nodeId);
}

function unwrapMaybeEncrypted<T>(payload: any, passphrase?: string): T {
  if (payload && typeof payload === 'object' && 'ciphertext' in payload) {
    return maybeDecrypt<T>(payload, passphrase);
  }
  return payload as T;
}

function wrapMaybeEncrypted<T>(payload: T, passphrase?: string) {
  return maybeEncrypt(payload, passphrase);
}

export class MegaNoteStorage {
  private storage: MegaStorage | null = null;
  private appFolder: MegaFile | null = null;
  private notesFolder: MegaFile | null = null;
  private attachmentsFolder: MegaFile | null = null;
  private labelsCache: Label[] | null = null;

  private async init() {
    if (this.storage && this.appFolder && this.notesFolder && this.attachmentsFolder) return;
    const storage = await getMegaRoot();
    const appFolder = await ensureFolder(storage, process.env.MEGA_FOLDER_NAME || 'NoteNest');
    const notesFolder = await ensureFolder(storage, `${process.env.MEGA_FOLDER_NAME || 'NoteNest'}-${NOTES_FOLDER}`);
    const attachmentsFolder = await ensureFolder(
      storage,
      `${process.env.MEGA_FOLDER_NAME || 'NoteNest'}-${ATTACHMENTS_FOLDER}`
    );
    this.storage = storage;
    this.appFolder = appFolder;
    this.notesFolder = notesFolder;
    this.attachmentsFolder = attachmentsFolder;
  }

  async getIndex(passphrase?: string): Promise<IndexFile> {
    await this.init();
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    const existingRaw = await readJsonFile<IndexFile | any>(
      this.appFolder,
      INDEX_FILE,
      (payload: any) =>
        typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt)
          ? payload.updatedAt
          : undefined
    );
    if (existingRaw) return unwrapMaybeEncrypted<IndexFile>(existingRaw, passphrase);
    const empty: IndexFile = { updatedAt: 0, notes: [] };
    await writeJsonFile(this.appFolder, INDEX_FILE, wrapMaybeEncrypted(empty, passphrase));
    return empty;
  }

  private async saveIndex(index: IndexFile, passphrase?: string) {
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    await writeJsonFile(this.appFolder, INDEX_FILE, wrapMaybeEncrypted(index, passphrase));
  }

  private findIndexEntry(index: IndexFile, id: string): IndexEntry | undefined {
    return index.notes.find((n) => n.id === id);
  }

  async getLabels(passphrase?: string): Promise<Label[]> {
    await this.init();
    if (this.labelsCache) return this.labelsCache;
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    const labelsRaw =
      (await readJsonFile<Label[] | any>(this.appFolder, LABELS_FILE, (payload: any) => {
        if (Array.isArray(payload)) {
          return payload.reduce(
            (max, label) => Math.max(max, Number(label?.updatedAt ?? 0)),
            0
          );
        }
        if (typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt)) {
          return payload.updatedAt;
        }
        return undefined;
      })) ?? [];
    const labels = unwrapMaybeEncrypted<Label[]>(labelsRaw, passphrase) ?? [];
    this.labelsCache = labels;
    return labels;
  }

  private async saveLabels(labels: Label[], passphrase?: string) {
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    await writeJsonFile(this.appFolder, LABELS_FILE, wrapMaybeEncrypted(labels, passphrase));
    this.labelsCache = labels;
  }

  async upsertLabel(label: Label, passphrase?: string) {
    const labels = await this.getLabels(passphrase);
    const existing = labels.find((l) => l.id === label.id);
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
    const next = labels.filter((l) => l.id !== id);
    await this.saveLabels(next, passphrase);
  }

  async readNote(id: string, passphrase?: string): Promise<NotePayload | null> {
    await this.init();
    if (!this.notesFolder) throw new Error('MEGA notes folder unavailable');
    const name = `NOTE_${id}.json`;
    const raw = await readJsonFile<NotePayload | any>(
      this.notesFolder,
      name,
      (payload: any) =>
        typeof payload?.updatedAt === 'number' && Number.isFinite(payload.updatedAt)
          ? payload.updatedAt
          : undefined
    );
    if (!raw) return null;
    return unwrapMaybeEncrypted<NotePayload>(raw, passphrase);
  }

  async readActiveNote(id: string, passphrase?: string): Promise<NotePayload | null> {
    const index = await this.getIndex(passphrase);
    const entry = this.findIndexEntry(index, id);
    if (entry?.deleted) return null;
    return this.readNote(id, passphrase);
  }

  async writeNote(note: NotePayload, passphrase?: string): Promise<void> {
    await this.init();
    if (!this.notesFolder) throw new Error('MEGA notes folder unavailable');
    const name = `NOTE_${note.id}.json`;
    const json = Buffer.from(JSON.stringify(wrapMaybeEncrypted(note, passphrase), null, 2));
    const upload = (this.notesFolder as any).upload(
      { name, allowUploadBuffer: true, target: this.notesFolder },
      json
    );
    const created = await upload.complete;
    await pruneNamedFiles(this.notesFolder, name, created?.nodeId);
  }

  async uploadAttachment(id: string, buffer: Buffer, mimeType?: string | null) {
    await this.init();
    if (!this.attachmentsFolder) throw new Error('MEGA attachments folder unavailable');
    const name = `ATT_${id}${extensionFromMime(mimeType)}`;
    const upload = (this.attachmentsFolder as any).upload(
      { name, allowUploadBuffer: true, target: this.attachmentsFolder },
      buffer
    );
    const created = await upload.complete;
    await pruneNamedFiles(this.attachmentsFolder, name, created?.nodeId);
  }

  private async findAttachmentFile(id: string): Promise<MegaFile | null> {
    await this.init();
    if (!this.attachmentsFolder) throw new Error('MEGA attachments folder unavailable');
    const file = this.attachmentsFolder.children?.find((c: any) => c.name?.startsWith(`ATT_${id}`));
    return file ?? null;
  }

  async downloadAttachment(id: string) {
    const file = await this.findAttachmentFile(id);
    if (!file) return null;
    const buf = await (file as any).downloadBuffer();
    return { buffer: buf, name: (file as any).name as string };
  }

  async syncPush(notes: NotePayload[], passphrase?: string) {
    const index = await this.getIndex(passphrase);
    const now = Date.now();

    for (const note of notes) {
      const entry = this.findIndexEntry(index, note.id);
      // last-write-wins on updatedAt
      if (entry && entry.updatedAt > note.updatedAt) {
        continue;
      }
      const updatedEntry: IndexEntry = { id: note.id, updatedAt: note.updatedAt, deleted: note.deleted };
      if (entry) {
        Object.assign(entry, updatedEntry);
      } else {
        index.notes.push(updatedEntry);
      }

      if (note.deleted) {
        // soft delete: do not remove file yet
        continue;
      }
      await this.writeNote(note, passphrase);
    }

    index.updatedAt = now;
    await this.saveIndex(index, passphrase);
    return { serverTime: now };
  }

  async syncPull(since: number, passphrase?: string) {
    const index = await this.getIndex(passphrase);
    const changedEntries = index.notes.filter((n) => n.updatedAt > since);
    const notes: NotePayload[] = [];
    for (const entry of changedEntries) {
      if (entry.deleted) {
        notes.push({ id: entry.id, updatedAt: entry.updatedAt, deleted: true });
        continue;
      }
      const note = await this.readNote(entry.id, passphrase);
      if (note) {
        notes.push(note);
      }
    }
    return { notes, serverTime: Date.now() };
  }
}
