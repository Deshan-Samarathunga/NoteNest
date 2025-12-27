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
  type?: 'TEXT' | 'CHECKLIST';
  checklist?: ChecklistItem[];
  createdAt?: number;
  labels?: string[];
  color?: number;
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
  reminderAt?: number | null;
  notificationId?: string | null;
  attachments?: AttachmentMeta[];
  updatedAt: number;
  deleted?: boolean;
};

export type SyncPullResponse = {
  notes: NotePayload[];
  labels?: Label[];
  serverTime: number;
};

export type SyncPushResponse = {
  serverTime: number;
};
