import { SQLiteDatabase } from 'expo-sqlite';

import { Attachment } from '@/src/types/models';

export class AttachmentsRepo {
  constructor(private readonly db: SQLiteDatabase) {}

  async listByNote(noteId: string): Promise<Attachment[]> {
    return this.db.getAllAsync<Attachment>(
      'SELECT * FROM attachments WHERE noteId = ? ORDER BY createdAt DESC',
      noteId
    );
  }

  async listByNoteIds(noteIds: string[]): Promise<Record<string, Attachment[]>> {
    if (noteIds.length === 0) return {};
    const placeholders = noteIds.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<Attachment>(
      `SELECT * FROM attachments WHERE noteId IN (${placeholders}) ORDER BY createdAt DESC`,
      ...noteIds
    );
    return rows.reduce<Record<string, Attachment[]>>((acc, attachment) => {
      acc[attachment.noteId] = acc[attachment.noteId] || [];
      acc[attachment.noteId].push(attachment);
      return acc;
    }, {});
  }

  async create(attachment: Attachment): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO attachments(id, noteId, uri, mimeType, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      attachment.id,
      attachment.noteId,
      attachment.uri,
      attachment.mimeType ?? null,
      attachment.createdAt
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM attachments WHERE id = ?', id);
  }

  async replaceForNote(noteId: string, attachments: Attachment[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM attachments WHERE noteId = ?', noteId);
      for (const attachment of attachments) {
        await this.create(attachment);
      }
    });
  }
}
