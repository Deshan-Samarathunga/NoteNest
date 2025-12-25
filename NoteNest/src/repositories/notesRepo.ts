import { SQLiteDatabase } from 'expo-sqlite';

import { boolToInt, intToBool } from '@/src/db/db';
import { ChecklistItem, Note, NoteInput, NotesFilter } from '@/src/types/models';

type NoteRow = {
  id: string;
  title: string | null;
  body: string | null;
  type: Note['type'];
  color: number;
  pinned: number;
  archived: number;
  trashed: number;
  reminderAt: number | null;
  notificationId: string | null;
  createdAt: number;
  updatedAt: number;
};

const mapNote = (row: NoteRow): Note => ({
  ...row,
  pinned: intToBool(row.pinned),
  archived: intToBool(row.archived),
  trashed: intToBool(row.trashed),
});

type ChecklistRow = {
  id: string;
  noteId: string;
  text: string;
  checked: number;
  sortOrder: number;
};

const mapChecklist = (row: ChecklistRow): ChecklistItem => ({
  ...row,
  checked: intToBool(row.checked),
});

export class NotesRepo {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(filter: NotesFilter = {}): Promise<Note[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];
    let query = 'SELECT DISTINCT n.* FROM notes n';

    if (filter.labelId) {
      query += ' INNER JOIN note_labels nl ON n.id = nl.noteId';
      where.push('nl.labelId = ?');
      params.push(filter.labelId);
    }

    let joinChecklist = false;

    if (filter.archivedOnly) {
      where.push('n.archived = 1');
      where.push('n.trashed = 0');
    } else if (!filter.includeArchived) {
      where.push('n.archived = 0');
    }

    if (filter.trashedOnly) {
      where.push('n.trashed = 1');
    } else if (!filter.includeTrashed) {
      where.push('n.trashed = 0');
    }

    if (filter.includePinned === true) {
      where.push('n.pinned = 1');
    } else if (filter.includePinned === false) {
      where.push('n.pinned = 0');
    }

    if (filter.search?.trim()) {
      const term = `%${filter.search.trim()}%`;
      joinChecklist = true;
      where.push('(n.title LIKE ? OR n.body LIKE ? OR c.text LIKE ?)');
      params.push(term, term, term);
    }

    if (filter.color !== undefined && filter.color !== null) {
      where.push('n.color = ?');
      params.push(filter.color);
    }

    if (joinChecklist) {
      query += ' LEFT JOIN checklist_items c ON n.id = c.noteId';
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    const sortBy = filter.sortBy ?? 'updatedAt';
    const sortColumn = sortBy === 'createdAt' ? 'n.createdAt' : 'n.updatedAt';
    query += ` ORDER BY n.pinned DESC, ${sortColumn} DESC`;

    const rows = await this.db.getAllAsync<NoteRow>(query, ...params);
    return rows.map(mapNote);
  }

  async getById(id: string): Promise<Note | null> {
    const row = await this.db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
    return row ? mapNote(row) : null;
  }

  async create(note: Note): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO notes(
        id, title, body, type, color, pinned, archived, trashed, reminderAt, notificationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      note.id,
      note.title ?? null,
      note.body ?? null,
      note.type,
      note.color,
      boolToInt(note.pinned),
      boolToInt(note.archived),
      boolToInt(note.trashed),
      note.reminderAt ?? null,
      note.notificationId ?? null,
      note.createdAt,
      note.updatedAt
    );
  }

  async update(id: string, patch: NoteInput & { updatedAt: number }): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (patch.title !== undefined) {
      sets.push('title = ?');
      params.push(patch.title ?? null);
    }
    if (patch.body !== undefined) {
      sets.push('body = ?');
      params.push(patch.body ?? null);
    }
    if (patch.type !== undefined) {
      sets.push('type = ?');
      params.push(patch.type);
    }
    if (patch.color !== undefined) {
      sets.push('color = ?');
      params.push(patch.color);
    }
    if (patch.pinned !== undefined) {
      sets.push('pinned = ?');
      params.push(boolToInt(patch.pinned));
    }
    if (patch.archived !== undefined) {
      sets.push('archived = ?');
      params.push(boolToInt(patch.archived));
    }
    if (patch.trashed !== undefined) {
      sets.push('trashed = ?');
      params.push(boolToInt(patch.trashed));
    }
    if (patch.reminderAt !== undefined) {
      sets.push('reminderAt = ?');
      params.push(patch.reminderAt ?? null);
    }
    if (patch.notificationId !== undefined) {
      sets.push('notificationId = ?');
      params.push(patch.notificationId ?? null);
    }

    sets.push('updatedAt = ?');
    params.push(patch.updatedAt);

    if (sets.length === 0) return;

    await this.db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
  }

  async softDelete(id: string, trashed: boolean): Promise<void> {
    await this.db.runAsync(
      'UPDATE notes SET trashed = ?, archived = ?, updatedAt = ? WHERE id = ?',
      boolToInt(trashed),
      0,
      Date.now(),
      id
    );
  }

  async purgeTrashedOlderThan(timestamp: number): Promise<number> {
    const result = await this.db.runAsync(
      'DELETE FROM notes WHERE trashed = 1 AND updatedAt < ?',
      timestamp
    );
    return result.changes ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM notes WHERE id = ?', id);
  }

  async getChecklist(noteId: string): Promise<ChecklistItem[]> {
    const rows = await this.db.getAllAsync<ChecklistRow>(
      'SELECT * FROM checklist_items WHERE noteId = ? ORDER BY sortOrder ASC',
      noteId
    );
    return rows.map(mapChecklist);
  }

  async replaceChecklist(noteId: string, items: ChecklistItem[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM checklist_items WHERE noteId = ?', noteId);
      for (const item of items) {
        await this.db.runAsync(
          `INSERT INTO checklist_items(id, noteId, text, checked, sortOrder)
           VALUES (?, ?, ?, ?, ?)`,
          item.id,
          noteId,
          item.text,
          boolToInt(item.checked),
          item.sortOrder
        );
      }
    });
  }
}
