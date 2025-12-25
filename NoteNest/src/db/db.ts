import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

export type DBConnection = SQLite.SQLiteDatabase;

const DATABASE_NAME = 'notenest.db';

export async function openDatabase(): Promise<DBConnection> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(db);
  return db;
}

export async function withDatabase<T>(
  handler: (db: DBConnection) => Promise<T>
): Promise<T> {
  const db = await openDatabase();
  return handler(db);
}

export function boolToInt(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}
