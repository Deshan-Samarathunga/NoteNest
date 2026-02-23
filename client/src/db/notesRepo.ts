import { v4 as uuidv4 } from 'uuid';

import { NotePayload } from '@/src/api/types';
import { databaseAdapter, NoteRecord } from './database';

export async function getAllNotes(): Promise<NotePayload[]> {
  const rows = await databaseAdapter.getAllNotes();
  return rows.map((r) => JSON.parse(r.payload) as NotePayload);
}

export async function getNote(id: string): Promise<NotePayload | null> {
  const rows = await databaseAdapter.getAllNotes();
  const found = rows.find((r) => r.id === id);
  return found ? (JSON.parse(found.payload) as NotePayload) : null;
}

export async function saveNote(note: NotePayload, markDirty = true) {
  const now = Date.now();
  const rows = await databaseAdapter.getAllNotes();
  const existing = rows.find((r) => r.id === note.id);
  const record: NoteRecord = {
    id: note.id,
    payload: JSON.stringify(note),
    updatedAt: note.updatedAt ?? now,
    localUpdatedAt: now,
    lastSyncedAt: markDirty ? null : now,
    dirty: markDirty ? 1 : 0,
    conflictOf: null,
  };
  const nextRows = existing
    ? rows.map((r) => (r.id === note.id ? record : r))
    : [...rows, record];
  await databaseAdapter.saveNotes(nextRows);
  if (markDirty) {
    await databaseAdapter.addMutation({
      id: uuidv4(),
      noteId: note.id,
      type: 'upsert',
      payload: JSON.stringify(note),
      createdAt: now,
    });
  }
}

export async function deleteNote(id: string, hard = false) {
  const rows = await databaseAdapter.getAllNotes();
  const remaining = rows.filter((r) => r.id !== id);
  await databaseAdapter.replaceNotes(remaining);
  if (!hard) {
    const now = Date.now();
    await databaseAdapter.addMutation({
      id: uuidv4(),
      noteId: id,
      type: 'delete',
      payload: JSON.stringify({ id, deleted: true, trashed: true, updatedAt: now }),
      createdAt: now,
    });
  }
}

export async function replaceAllNotes(notes: NotePayload[]) {
  const records: NoteRecord[] = notes.map((n) => ({
    id: n.id,
    payload: JSON.stringify(n),
    updatedAt: n.updatedAt ?? Date.now(),
    localUpdatedAt: n.updatedAt ?? Date.now(),
    lastSyncedAt: n.updatedAt ?? Date.now(),
    dirty: 0,
    conflictOf: null,
  }));
  await databaseAdapter.replaceNotes(records);
}
