import dayjs from 'dayjs';

import { NotePayload } from '@/src/api/types';
import { getAllNotes, saveNote } from '@/src/db/notesRepo';
import { queueAndSave, runSync } from '@/src/services/syncService';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function purgeOldTrashed(purgeDays: number) {
  const notes = await getAllNotes();
  const cutoff = dayjs().subtract(purgeDays, 'day').valueOf();
  const toPurge = notes.filter((n) => n.trashed && !n.deleted && (n.updatedAt ?? 0) < cutoff);
  if (!toPurge.length) return { purged: 0 };

  const now = Date.now();
  const payloads: NotePayload[] = toPurge.map((n) => ({
    ...n,
    trashed: true,
    deleted: true,
    updatedAt: now,
  }));

  for (const p of payloads) {
    await saveNote(p, true);
    await queueAndSave(p);
  }
  await runSync().catch(() => undefined);
  return { purged: toPurge.length };
}
