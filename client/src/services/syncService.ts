import { v4 as uuidv4 } from 'uuid';

import { pullNotes, pushNotes } from '@/src/api/notes';
import { Label, NotePayload } from '@/src/api/types';
import { replaceLabels } from '@/src/db/labelsRepo';
import { databaseAdapter } from '@/src/db/database';
import { clearMutations, enqueueUpsert, listMutations } from '@/src/db/mutationsRepo';
import { getAllNotes, replaceAllNotes, saveNote } from '@/src/db/notesRepo';

function mergeServerNotes(serverNotes: NotePayload[], localNotes: NotePayload[]) {
  const map = new Map(localNotes.map((n) => [n.id, n]));
  const recovered: NotePayload[] = [];
  for (const remote of serverNotes) {
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
      continue;
    }
    const localIsDirty = (local as any).dirty || false;
    const localUpdated = local.updatedAt ?? 0;
    const remoteUpdated = remote.updatedAt ?? 0;
    if (remote.deleted) {
      map.delete(remote.id);
      continue;
    }
    if (remoteUpdated >= localUpdated || !localIsDirty) {
      map.set(remote.id, remote);
    } else {
      // conflict: keep local but save remote as recovered
      recovered.push({
        ...remote,
        id: `recovered-${remote.id}-${Date.now()}`,
        title: remote.title ? `Recovered: ${remote.title}` : 'Recovered note',
      });
    }
  }
  return { notes: Array.from(map.values()), recovered };
}

export async function runSync() {
  const lastSync = await databaseAdapter.getLastSync();
  const pending = await listMutations();
  if (pending.length > 0) {
    const payload = pending.map((m) => JSON.parse(m.payload) as NotePayload);
    await pushNotes(payload);
    await clearMutations();
  }
  const pullResult = await pullNotes(lastSync);
  const local = await getAllNotes();
  const { notes: merged, recovered } = mergeServerNotes(pullResult.notes, local);
  const finalNotes = [...merged, ...recovered];
  await replaceAllNotes(finalNotes);
  if (pullResult.labels) {
    await replaceLabels(pullResult.labels as Label[]);
  }
  await databaseAdapter.setLastSync(pullResult.serverTime);
}

export async function queueAndSave(note: NotePayload) {
  await saveNote(note, true);
}

export async function clearLocalCache() {
  await databaseAdapter.clearAll();
}
