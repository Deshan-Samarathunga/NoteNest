export type NoteType = 'TEXT' | 'CHECKLIST';

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
  sortOrder: number;
};

export type AttachmentMeta = {
  id: string;
  uri: string;
  mimeType?: string | null;
  createdAt: number;
};

export type Label = {
  id: string;
  name: string;
  updatedAt: number;
};

export type NotePayload = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: NoteType;
  checklist?: ChecklistItem[];
  labels?: string[];
  color?: number;
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
  reminderAt?: number | null;
  notificationId?: string | null;
  attachments?: AttachmentMeta[];
  createdAt?: number;
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

export type SyncPullResponse = {
  notes: NotePayload[];
  labels?: Label[];
  serverTime: number;
};

export type SyncPushResponse = {
  serverTime: number;
};
