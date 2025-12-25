import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAppTheme } from '@/src/ui/theme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { openDatabase } from '@/src/db/db';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { purgeTrashedNotes } from '@/src/services/purgeService';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((s) => s.theme);
  const purgeDays = useSettingsStore((s) => s.purgeDays);
  const effectiveScheme = settingsTheme === 'system' ? systemColorScheme : settingsTheme;
  const appTheme = getAppTheme(effectiveScheme);
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const noteId = response.notification.request.content.data?.noteId as string | undefined;
      if (noteId) {
        router.push(`/note/${noteId}`);
      }
    });

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const runPurge = async () => {
      try {
        const db = await openDatabase();
        const repo = new NotesRepo(db);
        await purgeTrashedNotes(repo, purgeDays);
      } catch (err) {
        console.warn('Failed to purge trash on start', err);
      }
    };
    runPurge();
  }, [purgeDays]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={appTheme.paper}>
        <ThemeProvider value={appTheme.navigation}>
          <Stack>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="note/new" options={{ title: 'New Note', presentation: 'card' }} />
            <Stack.Screen name="note/[id]" options={{ title: 'Note', presentation: 'card' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style={appTheme.statusBarStyle} />
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
