import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

const DEFAULT_SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      defaultLayout: 'grid',
      purgeDays: 7,
<<<<<<< HEAD
      serverUrl: getDefaultServerUrl(),
=======
      serverUrl: DEFAULT_SERVER_URL,
>>>>>>> b6b73d5c15d0011d529497594fd80a3909826e8d
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
