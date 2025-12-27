export type NoteType = 'TEXT' | 'CHECKLIST';

export type Note = {
  id: string;
  title: string | null;
  body: string | null;
  type: NoteType;
  color: number;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  reminderAt: number | null;
  notificationId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ChecklistItem = {
  id: string;
  noteId: string;
  text: string;
  checked: boolean;
  sortOrder: number;
};

export type Label = {
  id: string;
  name: string;
};

export type NoteLabel = {
  noteId: string;
  labelId: string;
};

export type Attachment = {
  id: string;
  noteId: string;
  uri: string;
  mimeType?: string | null;
  createdAt: number;
};

export type SortOption = 'updatedAt' | 'createdAt';
export type LayoutMode = 'list' | 'grid';
export type ThemePreference = 'system' | 'light' | 'dark';

export type NoteInput = Partial<
  Pick<
    Note,
    | 'title'
    | 'body'
    | 'type'
    | 'color'
    | 'pinned'
    | 'archived'
    | 'trashed'
    | 'reminderAt'
    | 'notificationId'
  >
>;

export type NotesFilter = {
  labelId?: string | null;
  color?: number | null;
  search?: string;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  includePinned?: boolean;
  archivedOnly?: boolean;
  trashedOnly?: boolean;
  sortBy?: SortOption;
};
