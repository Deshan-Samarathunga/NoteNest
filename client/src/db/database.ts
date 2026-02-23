import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'notenest.db';
const isWeb = Platform.OS === 'web';

export type NoteRecord = {
  id: string;
  payload: string;
  updatedAt: number;
  localUpdatedAt: number;
  lastSyncedAt: number | null;
  dirty: number;
  conflictOf?: string | null;
};

export type MutationRecord = {
  id: string;
  noteId: string;
  type: string;
  payload: string;
  createdAt: number;
};

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
  if (isWeb) return null;
  if (!db) {
<<<<<<< HEAD
    db = SQLite.openDatabaseSync(DB_NAME);
=======
    const sqliteModule = SQLite as unknown as {
      openDatabaseSync?: (name: string) => SQLite.SQLiteDatabase;
      openDatabase?: (name: string) => SQLite.SQLiteDatabase;
    };
    if (typeof sqliteModule.openDatabaseSync === 'function') {
      db = sqliteModule.openDatabaseSync(DB_NAME);
    } else if (typeof sqliteModule.openDatabase === 'function') {
      db = sqliteModule.openDatabase(DB_NAME);
    } else {
      throw new Error('SQLite database API is unavailable in this runtime');
    }
>>>>>>> b6b73d5c15d0011d529497594fd80a3909826e8d
  }
  return db;
}

export async function runMigrations() {
  if (isWeb) {
    // nothing to migrate for web fallback
    return;
  }
  const database = getDb();
  if (!database) return;
  await database.execAsync?.(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      localUpdatedAt INTEGER NOT NULL,
      lastSyncedAt INTEGER,
      dirty INTEGER NOT NULL DEFAULT 0,
      conflictOf TEXT
    );
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS note_labels (
      noteId TEXT NOT NULL,
      labelId TEXT NOT NULL,
      PRIMARY KEY (noteId, labelId)
    );
    CREATE TABLE IF NOT EXISTS pending_mutations (
      id TEXT PRIMARY KEY,
      noteId TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Web fallback uses AsyncStorage
const WEB_KEYS = {
  NOTES: 'notenest-web-notes',
  LABELS: 'notenest-web-labels',
  MUTATIONS: 'notenest-web-mutations',
  META: 'notenest-web-meta',
};

export const databaseAdapter = {
  async getAllNotes(): Promise<NoteRecord[]> {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.NOTES)) || '[]';
      return JSON.parse(raw) as NoteRecord[];
    }
    const database = getDb();
    const res = await database?.getAllAsync<NoteRecord>('SELECT * FROM notes')!;
    return res;
  },
  async saveNotes(records: NoteRecord[]) {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_KEYS.NOTES, JSON.stringify(records));
      return;
    }
    const database = getDb();
    const stmt =
      'INSERT OR REPLACE INTO notes (id, payload, updatedAt, localUpdatedAt, lastSyncedAt, dirty, conflictOf) VALUES (?, ?, ?, ?, ?, ?, ?)';
    await database?.withTransactionAsync?.(async () => {
      for (const r of records) {
        await database.runAsync(stmt, [
          r.id,
          r.payload,
          r.updatedAt,
          r.localUpdatedAt,
          r.lastSyncedAt ?? null,
          r.dirty,
          r.conflictOf ?? null,
        ]);
      }
    });
  },
  async replaceNotes(records: NoteRecord[]) {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_KEYS.NOTES, JSON.stringify(records));
      return;
    }
    const database = getDb();
    await database?.execAsync?.('DELETE FROM notes');
    await this.saveNotes(records);
  },
  async getLastSync(): Promise<number> {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.META)) || '{}';
      const meta = JSON.parse(raw);
      return meta.lastSync ?? 0;
    }
    const database = getDb();
    const row = await database?.getFirstAsync<{ value: string }>('SELECT value FROM metadata WHERE key=?', [
      'lastSync',
    ]);
    return row ? Number(row.value) || 0 : 0;
  },
  async setLastSync(ts: number) {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.META)) || '{}';
      const meta = JSON.parse(raw);
      meta.lastSync = ts;
      await AsyncStorage.setItem(WEB_KEYS.META, JSON.stringify(meta));
      return;
    }
    const database = getDb();
    await database?.runAsync('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)', ['lastSync', String(ts)]);
  },
  async addMutation(record: MutationRecord) {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.MUTATIONS)) || '[]';
      const list = JSON.parse(raw) as MutationRecord[];
      list.push(record);
      await AsyncStorage.setItem(WEB_KEYS.MUTATIONS, JSON.stringify(list));
      return;
    }
    const database = getDb();
    await database?.runAsync(
      'INSERT OR REPLACE INTO pending_mutations (id, noteId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)',
      [record.id, record.noteId, record.type, record.payload, record.createdAt]
    );
  },
  async listMutations(): Promise<MutationRecord[]> {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.MUTATIONS)) || '[]';
      return JSON.parse(raw) as MutationRecord[];
    }
    const database = getDb();
    const rows = await database?.getAllAsync<MutationRecord>('SELECT * FROM pending_mutations ORDER BY createdAt ASC')!;
    return rows;
  },
  async clearMutations() {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_KEYS.MUTATIONS, '[]');
      return;
    }
    const database = getDb();
    await database?.execAsync?.('DELETE FROM pending_mutations');
  },
  async replaceLabels(labels: { id: string; name: string; updatedAt: number }[]) {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_KEYS.LABELS, JSON.stringify(labels));
      return;
    }
    const database = getDb();
    await database?.withTransactionAsync?.(async () => {
      await database.execAsync?.('DELETE FROM labels');
      for (const l of labels) {
        await database.runAsync('INSERT OR REPLACE INTO labels (id, name, updatedAt) VALUES (?, ?, ?)', [
          l.id,
          l.name,
          l.updatedAt,
        ]);
      }
    });
  },
  async getLabels(): Promise<{ id: string; name: string; updatedAt: number }[]> {
    if (isWeb) {
      const raw = (await AsyncStorage.getItem(WEB_KEYS.LABELS)) || '[]';
      return JSON.parse(raw);
    }
    const database = getDb();
    const rows = await database?.getAllAsync<{ id: string; name: string; updatedAt: number }>(
      'SELECT * FROM labels'
    )!;
    return rows;
  },
  async clearAll() {
    if (isWeb) {
      await AsyncStorage.multiRemove([WEB_KEYS.NOTES, WEB_KEYS.LABELS, WEB_KEYS.MUTATIONS, WEB_KEYS.META]);
      return;
    }
    const database = getDb();
    await database?.withTransactionAsync?.(async () => {
      await database.execAsync?.('DELETE FROM notes');
      await database.execAsync?.('DELETE FROM labels');
      await database.execAsync?.('DELETE FROM note_labels');
      await database.execAsync?.('DELETE FROM pending_mutations');
      await database.execAsync?.('DELETE FROM metadata');
    });
  },
};
