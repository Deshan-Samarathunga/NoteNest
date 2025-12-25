import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { LayoutMode, ThemePreference } from '@/src/types/models';

type SettingsState = {
  theme: ThemePreference;
  defaultLayout: LayoutMode;
  purgeDays: 7 | 14 | 30;
  setTheme: (theme: ThemePreference) => void;
  setDefaultLayout: (layout: LayoutMode) => void;
  setPurgeDays: (days: 7 | 14 | 30) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      defaultLayout: 'grid',
      purgeDays: 7,
      setTheme: (theme) => set({ theme }),
      setDefaultLayout: (layout) => set({ defaultLayout: layout }),
      setPurgeDays: (days) => set({ purgeDays: days }),
    }),
    {
      name: 'notenest-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
