'use client';

import { Label, NotePayload } from '@/lib/sync/types';

export type MutationRecord = {
  id: string;
  noteId: string;
  payload: NotePayload;
  createdAt: number;
};

export type WebSettings = {
  token: string | null;
  theme: 'system' | 'light' | 'dark';
  layout: 'grid' | 'list';
  purgeDays: 7 | 14 | 30;
};

const KEYS = {
  notes: 'notenest-web-notes',
  labels: 'notenest-web-labels',
  mutations: 'notenest-web-mutations',
  meta: 'notenest-web-meta',
  settings: 'notenest-web-settings'
};

const defaultSettings: WebSettings = {
  token: null,
  theme: 'system',
  layout: 'grid',
  purgeDays: 7
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getCachedNotes() {
  return read<NotePayload[]>(KEYS.notes, []);
}

export function saveCachedNotes(notes: NotePayload[]) {
  write(KEYS.notes, notes);
}

export function getCachedLabels() {
  return read<Label[]>(KEYS.labels, []);
}

export function saveCachedLabels(labels: Label[]) {
  write(KEYS.labels, labels);
}

export function listMutations() {
  return read<MutationRecord[]>(KEYS.mutations, []);
}

export function addMutation(note: NotePayload) {
  const mutations = listMutations();
  mutations.push({
    id: crypto.randomUUID(),
    noteId: note.id,
    payload: note,
    createdAt: Date.now()
  });
  write(KEYS.mutations, mutations);
}

export function clearMutations() {
  write(KEYS.mutations, []);
}

export function getLastSync() {
  return read<{ lastSync: number }>(KEYS.meta, { lastSync: 0 }).lastSync || 0;
}

export function setLastSync(lastSync: number) {
  write(KEYS.meta, { lastSync });
}

export function getSettings() {
  return { ...defaultSettings, ...read<Partial<WebSettings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: WebSettings) {
  write(KEYS.settings, settings);
}

export function clearLocalCache() {
  window.localStorage.removeItem(KEYS.notes);
  window.localStorage.removeItem(KEYS.labels);
  window.localStorage.removeItem(KEYS.mutations);
  window.localStorage.removeItem(KEYS.meta);
}
