import { SQLiteDatabase } from 'expo-sqlite';

import { AttachmentsRepo } from '@/src/repositories/attachmentsRepo';
import { LabelsRepo } from '@/src/repositories/labelsRepo';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { Note, NoteInput, NotesFilter } from '@/src/types/models';

export function createNotesService(db: SQLiteDatabase) {
  const notesRepo = new NotesRepo(db);
  const labelsRepo = new LabelsRepo(db);
  const attachmentsRepo = new AttachmentsRepo(db);

  return {
    list: (filter?: NotesFilter) => notesRepo.list(filter),
    getById: (id: string) => notesRepo.getById(id),
    create: (note: Note) => notesRepo.create(note),
    update: (id: string, patch: NoteInput & { updatedAt: number }) =>
      notesRepo.update(id, patch),
    softDelete: (id: string, trashed: boolean) => notesRepo.softDelete(id, trashed),
    purgeTrashedOlderThan: (timestamp: number) => notesRepo.purgeTrashedOlderThan(timestamp),
    labelsRepo,
    attachmentsRepo,
  };
}
