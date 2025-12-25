import { SQLiteDatabase } from 'expo-sqlite';

import { Label } from '@/src/types/models';

export class LabelsRepo {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<Label[]> {
    const rows = await this.db.getAllAsync<Label>('SELECT * FROM labels ORDER BY name ASC');
    return rows;
  }

  async getLabelsForNote(noteId: string): Promise<Label[]> {
    const rows = await this.db.getAllAsync<Label>(
      `SELECT l.* FROM labels l
       INNER JOIN note_labels nl ON nl.labelId = l.id
       WHERE nl.noteId = ?
       ORDER BY l.name ASC`,
      noteId
    );
    return rows;
  }

  async create(label: Label): Promise<void> {
    await this.db.runAsync('INSERT INTO labels(id, name) VALUES (?, ?)', label.id, label.name);
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.runAsync('UPDATE labels SET name = ? WHERE id = ?', name, id);
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM labels WHERE id = ?', id);
  }

  async assignToNote(noteId: string, labelId: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO note_labels(noteId, labelId) VALUES (?, ?)',
      noteId,
      labelId
    );
  }

  async removeFromNote(noteId: string, labelId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM note_labels WHERE noteId = ? AND labelId = ?', noteId, labelId);
  }

  async replaceNoteLabels(noteId: string, labelIds: string[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM note_labels WHERE noteId = ?', noteId);
      for (const labelId of labelIds) {
        await this.assignToNote(noteId, labelId);
      }
    });
  }
}
