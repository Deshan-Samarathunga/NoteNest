import { Storage as MegaStorage } from 'megajs';

import { ensureFolder, getMegaRoot } from './megaClient';
import { IndexEntry, IndexFile, Label, NotePayload } from './types';

type MegaFile = any;

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

async function readJsonFile<T>(folder: MegaStorage['root'] | MegaFile, name: string): Promise<T | null> {
  const existing = (folder as any)?.children?.find((c: any) => c.name === name) ?? null;
  if (!existing) return null;
  const buf = await existing.downloadBuffer();
  return JSON.parse(buf.toString('utf-8')) as T;
}

async function writeJsonFile(folder: MegaFile, name: string, data: unknown) {
  const json = Buffer.from(JSON.stringify(data, null, 2));
  await folder.upload({ name, allowUploadBuffer: true, target: folder }, json);
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

  async getIndex(): Promise<IndexFile> {
    await this.init();
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    const existing = await readJsonFile<IndexFile>(this.appFolder, INDEX_FILE);
    if (existing) return existing;
    const empty: IndexFile = { updatedAt: 0, notes: [] };
    await writeJsonFile(this.appFolder, INDEX_FILE, empty);
    return empty;
  }

  private async saveIndex(index: IndexFile) {
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    await writeJsonFile(this.appFolder, INDEX_FILE, index);
  }

  private findIndexEntry(index: IndexFile, id: string): IndexEntry | undefined {
    return index.notes.find((n) => n.id === id);
  }

  async getLabels(): Promise<Label[]> {
    await this.init();
    if (this.labelsCache) return this.labelsCache;
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    const labels = (await readJsonFile<Label[]>(this.appFolder, LABELS_FILE)) ?? [];
    this.labelsCache = labels;
    return labels;
  }

  private async saveLabels(labels: Label[]) {
    if (!this.appFolder) throw new Error('MEGA app folder unavailable');
    await writeJsonFile(this.appFolder, LABELS_FILE, labels);
    this.labelsCache = labels;
  }

  async upsertLabel(label: Label) {
    const labels = await this.getLabels();
    const existing = labels.find((l) => l.id === label.id);
    if (existing) {
      if (existing.updatedAt > label.updatedAt) return;
      existing.name = label.name;
      existing.updatedAt = label.updatedAt;
    } else {
      labels.push(label);
    }
    await this.saveLabels(labels);
  }

  async deleteLabel(id: string) {
    const labels = await this.getLabels();
    const next = labels.filter((l) => l.id !== id);
    await this.saveLabels(next);
  }

  async readNote(id: string): Promise<NotePayload | null> {
    await this.init();
    if (!this.notesFolder) throw new Error('MEGA notes folder unavailable');
    const name = `NOTE_${id}.json`;
    const existing = this.notesFolder.children.find((c: any) => c.name === name);
    if (!existing) return null;
    const buf = await (existing as any).downloadBuffer();
    return JSON.parse(buf.toString('utf-8')) as NotePayload;
  }

  async writeNote(note: NotePayload): Promise<void> {
    await this.init();
    if (!this.notesFolder) throw new Error('MEGA notes folder unavailable');
    const name = `NOTE_${note.id}.json`;
    const json = Buffer.from(JSON.stringify(note, null, 2));
    await (this.notesFolder as any).upload(
      { name, allowUploadBuffer: true, target: this.notesFolder },
      json
    );
  }

  async uploadAttachment(id: string, buffer: Buffer, mimeType?: string | null) {
    await this.init();
    if (!this.attachmentsFolder) throw new Error('MEGA attachments folder unavailable');
    const name = `ATT_${id}${extensionFromMime(mimeType)}`;
    await (this.attachmentsFolder as any).upload(
      { name, allowUploadBuffer: true, target: this.attachmentsFolder },
      buffer
    );
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

  async syncPush(notes: NotePayload[]) {
    const index = await this.getIndex();
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
      await this.writeNote(note);
    }

    index.updatedAt = now;
    await this.saveIndex(index);
    return { serverTime: now };
  }

  async syncPull(since: number) {
    const index = await this.getIndex();
    const changedEntries = index.notes.filter((n) => n.updatedAt > since);
    const notes: NotePayload[] = [];
    for (const entry of changedEntries) {
      if (entry.deleted) {
        notes.push({ id: entry.id, updatedAt: entry.updatedAt, deleted: true });
        continue;
      }
      const note = await this.readNote(entry.id);
      if (note) {
        notes.push(note);
      }
    }
    return { notes, serverTime: Date.now() };
  }
}
