import { pullNotes, pushNotes } from '@/src/api/notes';
import { Label, NotePayload } from '@/src/api/types';
import { replaceLabels } from '@/src/db/labelsRepo';
import { databaseAdapter, NoteRecord } from '@/src/db/database';
import { clearMutations, listMutations } from '@/src/db/mutationsRepo';
import { replaceAllNotes, saveNote } from '@/src/db/notesRepo';

type LocalMergeState = {
  note: NotePayload;
  dirty: boolean;
  updatedAt: number;
};

function mergeServerNotes(serverNotes: NotePayload[], localRecords: NoteRecord[]) {
  const map = new Map<string, LocalMergeState>();
  for (const row of localRecords) {
    try {
      const note = JSON.parse(row.payload) as NotePayload;
      map.set(row.id, {
        note,
        dirty: row.dirty === 1,
        updatedAt: Number(note.updatedAt ?? row.updatedAt ?? 0),
      });
    } catch {
      // ignore malformed local rows
    }
  }

  const recovered: NotePayload[] = [];
  for (const remote of serverNotes) {
    const localState = map.get(remote.id);
    if (!localState) {
      map.set(remote.id, {
        note: remote,
        dirty: false,
        updatedAt: Number(remote.updatedAt ?? 0),
      });
      continue;
    }
    const localUpdated = Number(localState.updatedAt ?? 0);
    const remoteUpdated = Number(remote.updatedAt ?? 0);
    if (remote.deleted) {
      map.delete(remote.id);
      continue;
    }
    if (remoteUpdated >= localUpdated || !localState.dirty) {
      map.set(remote.id, {
        note: remote,
        dirty: false,
        updatedAt: remoteUpdated,
      });
    } else {
      // conflict: keep local but save remote as recovered
      recovered.push({
        ...remote,
        id: `recovered-${remote.id}-${Date.now()}`,
        title: remote.title ? `Recovered: ${remote.title}` : 'Recovered note',
      });
    }
  }
  return { notes: Array.from(map.values()).map((item) => item.note), recovered };
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
  const localRows = await databaseAdapter.getAllNotes();
  const { notes: merged, recovered } = mergeServerNotes(pullResult.notes, localRows);
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
