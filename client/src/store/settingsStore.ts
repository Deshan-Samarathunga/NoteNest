import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getDefaultServerUrl } from '@/src/config/serverUrl';
import { LayoutMode, ThemePreference } from '@/src/types/models';

type SettingsState = {
  theme: ThemePreference;
  defaultLayout: LayoutMode;
  purgeDays: 7 | 14 | 30;
  serverUrl: string;
  sessionToken: string | null;
  sessionPassphrase: string;
  setTheme: (theme: ThemePreference) => void;
  setDefaultLayout: (layout: LayoutMode) => void;
  setPurgeDays: (days: 7 | 14 | 30) => void;
  setServerUrl: (url: string) => void;
  setSessionToken: (token: string | null) => void;
  setSessionPassphrase: (value: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      defaultLayout: 'grid',
      purgeDays: 7,
      serverUrl: getDefaultServerUrl(),
      sessionToken: null,
      sessionPassphrase: '',
      setTheme: (theme) => set({ theme }),
      setDefaultLayout: (layout) => set({ defaultLayout: layout }),
      setPurgeDays: (days) => set({ purgeDays: days }),
      setServerUrl: (url) => set({ serverUrl: url }),
      setSessionToken: (token) => set({ sessionToken: token }),
      setSessionPassphrase: (value) => set({ sessionPassphrase: value }),
    }),
    {
      name: 'notenest-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        defaultLayout: state.defaultLayout,
        purgeDays: state.purgeDays,
        serverUrl: state.serverUrl,
        sessionToken: state.sessionToken,
        // Do not persist passphrase
      }),
    }
  )
);
