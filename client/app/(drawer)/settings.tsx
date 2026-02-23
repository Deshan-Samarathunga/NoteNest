import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, RadioButton, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { useNotesUiStore } from '@/src/store/notesUiStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { login } from '@/src/api/auth';
import { runSync, clearLocalCache } from '@/src/services/syncService';
import { getDefaultServerUrl } from '@/src/config/serverUrl';

export default function SettingsScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const purgeDays = useSettingsStore((s) => s.purgeDays);
  const setPurgeDays = useSettingsStore((s) => s.setPurgeDays);
  const defaultLayout = useSettingsStore((s) => s.defaultLayout);
  const setDefaultLayout = useSettingsStore((s) => s.setDefaultLayout);
  const setCurrentLayout = useNotesUiStore((s) => s.setLayout);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);
  const sessionPassphrase = useSettingsStore((s) => s.sessionPassphrase);
  const setSessionPassphrase = useSettingsStore((s) => s.setSessionPassphrase);
  const sessionToken = useSettingsStore((s) => s.sessionToken);
  const setSessionToken = useSettingsStore((s) => s.setSessionToken);
  const [draftServerUrl, setDraftServerUrl] = useState(serverUrl);
  const [draftPassphrase, setDraftPassphrase] = useState(sessionPassphrase);
  const [syncing, setSyncing] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLayoutChange = (layout: 'list' | 'grid') => {
    setDefaultLayout(layout);
    setCurrentLayout(layout);
  };

  const saveServerUrl = () => {
    if (draftServerUrl.trim()) {
      setServerUrl(draftServerUrl.trim());
    }
  };

  const resetServerUrl = () => {
    const defaultUrl = getDefaultServerUrl();
    setDraftServerUrl(defaultUrl);
    setServerUrl(defaultUrl);
  };

  const savePassphrase = () => {
    setSessionPassphrase(draftPassphrase);
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await runSync();
    } catch (err) {
      Alert.alert('Sync failed', 'Could not complete sync. Check server URL and login state.');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const clearCache = async () => {
    try {
      await clearLocalCache();
    } catch (err) {
      Alert.alert('Clear cache failed', 'Could not clear local cache.');
      console.error(err);
    }
  };

  const doLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await login(loginUser.trim(), loginPass);
      setSessionToken(res.token);
    } catch (err) {
      Alert.alert('Login failed', 'Invalid credentials or server unavailable.');
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <View style={styles.section}>
        <Text variant="titleMedium">Theme</Text>
        <SegmentedButtons
          value={theme}
          onValueChange={(v) => v && setTheme(v as any)}
          buttons={[
            { value: 'system', label: 'System', icon: 'theme-light-dark' },
            { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
            { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
          ]}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Default layout</Text>
        <SegmentedButtons
          value={defaultLayout}
          onValueChange={(v) => v && handleLayoutChange(v as 'list' | 'grid')}
          buttons={[
            { value: 'list', label: 'List', icon: 'view-agenda-outline' },
            { value: 'grid', label: 'Grid', icon: 'view-grid-outline' },
          ]}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Purge trash after</Text>
        <RadioButton.Group
          onValueChange={(v) => setPurgeDays(Number(v) as 7 | 14 | 30)}
          value={String(purgeDays)}>
          <RadioButton.Item label="7 days" value="7" />
          <RadioButton.Item label="14 days" value="14" />
          <RadioButton.Item label="30 days" value="30" />
        </RadioButton.Group>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Server URL</Text>
        <TextInput
          mode="outlined"
          label="API base URL"
          value={draftServerUrl}
          onChangeText={setDraftServerUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={saveServerUrl}>
            Save
          </Button>
          <Button mode="text" onPress={resetServerUrl}>
            Reset
          </Button>
        </View>
        <Text variant="bodySmall" style={{ color: '#888' }}>
          Android emulator usually needs 10.0.2.2, while web/iOS simulator can use localhost. Physical devices should
          use the computer LAN IP.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Session passphrase</Text>
        <TextInput
          mode="outlined"
          label="Passphrase (not persisted)"
          value={draftPassphrase}
          onChangeText={setDraftPassphrase}
          secureTextEntry
        />
        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={savePassphrase}>
            Save
          </Button>
          <Button mode="text" onPress={() => setDraftPassphrase('')}>
            Clear
          </Button>
        </View>
        <Text variant="bodySmall" style={{ color: '#888' }}>
          Used for future encrypted payloads. Not stored on disk.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Sync</Text>
        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={syncNow} loading={syncing}>
            Sync now
          </Button>
          <Button mode="text" onPress={clearCache} disabled={syncing}>
            Clear cache
          </Button>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Auth (demo)</Text>
        <TextInput label="Username" mode="outlined" value={loginUser} onChangeText={setLoginUser} />
        <TextInput
          label="Password"
          mode="outlined"
          value={loginPass}
          onChangeText={setLoginPass}
          secureTextEntry
        />
        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={doLogin} loading={authLoading}>
            Login
          </Button>
          <Button mode="text" onPress={() => setSessionToken(null)} disabled={authLoading}>
            Logout
          </Button>
        </View>
        {sessionToken ? <Text variant="bodySmall">Token saved.</Text> : <Text variant="bodySmall">Not logged in.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
});
