import dayjs from 'dayjs';

import { pushNotes } from '@/src/api/notes';
import { NotePayload } from '@/src/api/types';
import { loadCachedNotes, saveCachedNotes } from '@/src/cache/notesCache';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function purgeOldTrashed(purgeDays: number) {
  const notes = await loadCachedNotes();
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

  await pushNotes(payloads);
  const remaining = notes.filter((n) => !toPurge.some((t) => t.id === n.id));
  await saveCachedNotes(remaining);
  return { purged: toPurge.length };
}
