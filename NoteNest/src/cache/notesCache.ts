import AsyncStorage from '@react-native-async-storage/async-storage';

import { NotePayload } from '@/src/api/types';

const KEY = 'notenest-notes-cache';
const META_KEY = 'notenest-notes-cache-meta';

export async function loadCachedNotes(): Promise<NotePayload[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NotePayload[];
  } catch {
    return [];
  }
}

export async function saveCachedNotes(notes: NotePayload[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(notes));
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ updatedAt: Date.now() }));
  } catch {
    // ignore
  }
}

export async function getCacheUpdatedAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return 0;
    const meta = JSON.parse(raw) as { updatedAt: number };
    return meta.updatedAt ?? 0;
  } catch {
    return 0;
  }
}
