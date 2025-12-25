import { NotesRepo } from '@/src/repositories/notesRepo';

export async function purgeTrashedNotes(notesRepo: NotesRepo, purgeDays: number): Promise<number> {
  const cutoff = Date.now() - purgeDays * 24 * 60 * 60 * 1000;
  return notesRepo.purgeTrashedOlderThan(cutoff);
}
