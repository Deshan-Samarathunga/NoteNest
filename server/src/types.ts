export type NotePayload = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: 'TEXT' | 'CHECKLIST';
  checklist?: Array<{ id: string; text: string; checked: boolean; sortOrder: number }>;
  createdAt?: number;
  labels?: string[];
  color?: number;
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
  reminderAt?: number | null;
  notificationId?: string | null;
  attachments?: Array<{ id: string; uri: string; mimeType?: string | null; createdAt: number }>;
  updatedAt: number;
  deleted?: boolean;
};

export type IndexEntry = {
  id: string;
  updatedAt: number;
  deleted?: boolean;
};

export type IndexFile = {
  updatedAt: number;
  notes: IndexEntry[];
};

export type Label = {
  id: string;
  name: string;
  updatedAt: number;
};
