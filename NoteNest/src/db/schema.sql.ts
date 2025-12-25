export const CREATE_NOTES_TABLE = `
CREATE TABLE IF NOT EXISTS notes(
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  type TEXT CHECK(type IN ('TEXT','CHECKLIST')) NOT NULL,
  color INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  trashed INTEGER NOT NULL DEFAULT 0,
  reminderAt INTEGER,
  notificationId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);`;

export const CREATE_CHECKLIST_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS checklist_items(
  id TEXT PRIMARY KEY,
  noteId TEXT NOT NULL,
  text TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  sortOrder INTEGER NOT NULL,
  FOREIGN KEY(noteId) REFERENCES notes(id) ON DELETE CASCADE
);`;

export const CREATE_LABELS_TABLE = `
CREATE TABLE IF NOT EXISTS labels(
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);`;

export const CREATE_NOTE_LABELS_TABLE = `
CREATE TABLE IF NOT EXISTS note_labels(
  noteId TEXT NOT NULL,
  labelId TEXT NOT NULL,
  PRIMARY KEY(noteId, labelId),
  FOREIGN KEY(noteId) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY(labelId) REFERENCES labels(id) ON DELETE CASCADE
);`;

export const CREATE_ATTACHMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS attachments(
  id TEXT PRIMARY KEY,
  noteId TEXT NOT NULL,
  uri TEXT NOT NULL,
  mimeType TEXT,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY(noteId) REFERENCES notes(id) ON DELETE CASCADE
);`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_trashed ON notes(trashed);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminderAt);`,
  `CREATE INDEX IF NOT EXISTS idx_checklist_note ON checklist_items(noteId);`,
  `CREATE INDEX IF NOT EXISTS idx_checklist_sort ON checklist_items(noteId, sortOrder);`,
  `CREATE INDEX IF NOT EXISTS idx_note_labels_note ON note_labels(noteId);`,
  `CREATE INDEX IF NOT EXISTS idx_note_labels_label ON note_labels(labelId);`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(noteId);`,
];

export const INITIAL_SCHEMA = [
  CREATE_NOTES_TABLE,
  CREATE_CHECKLIST_ITEMS_TABLE,
  CREATE_LABELS_TABLE,
  CREATE_NOTE_LABELS_TABLE,
  CREATE_ATTACHMENTS_TABLE,
  ...CREATE_INDEXES,
];
