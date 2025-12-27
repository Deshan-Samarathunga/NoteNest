import { v4 as uuidv4 } from 'uuid';

import { databaseAdapter, MutationRecord } from './database';
import { NotePayload } from '@/src/api/types';

export async function enqueueUpsert(note: NotePayload) {
  const rec: MutationRecord = {
    id: uuidv4(),
    noteId: note.id,
    type: 'upsert',
    payload: JSON.stringify(note),
    createdAt: Date.now(),
  };
  await databaseAdapter.addMutation(rec);
}

export async function enqueueDelete(noteId: string, payload: Partial<NotePayload>) {
  const rec: MutationRecord = {
    id: uuidv4(),
    noteId: noteId,
    type: 'delete',
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
  };
  await databaseAdapter.addMutation(rec);
}

export async function listMutations() {
  return databaseAdapter.listMutations();
}

export async function clearMutations() {
  return databaseAdapter.clearMutations();
}
