import AsyncStorage from '@react-native-async-storage/async-storage';

import { Label } from '@/src/api/types';

const KEY = 'notenest-labels-cache';

export async function loadCachedLabels(): Promise<Label[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Label[];
  } catch {
    return [];
  }
}

export async function saveCachedLabels(labels: Label[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(labels));
  } catch {
    // ignore
  }
}
