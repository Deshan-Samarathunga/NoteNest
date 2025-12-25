import { SQLiteDatabase } from 'expo-sqlite';

import { INITIAL_SCHEMA } from './schema.sql';

export type Migration = {
  id: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS migrations(
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  appliedAt INTEGER NOT NULL
);`;

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'initial-schema',
    up: async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      for (const statement of INITIAL_SCHEMA) {
        await db.execAsync(statement);
      }
    },
  },
];

async function ensureMigrationsTable(db: SQLiteDatabase) {
  await db.execAsync(CREATE_MIGRATIONS_TABLE);
}

async function getCurrentVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version DESC LIMIT 1'
  );

  return row?.version ?? 0;
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await ensureMigrationsTable(db);
  const currentVersion = await getCurrentVersion(db);

  for (const migration of MIGRATIONS) {
    if (migration.id <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO migrations(version, name, appliedAt) VALUES (?, ?, ?)',
        migration.id,
        migration.name,
        Date.now()
      );
    });
  }
}
