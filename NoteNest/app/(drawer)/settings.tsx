import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, RadioButton, Text, TextInput, ToggleButton } from 'react-native-paper';

import { useNotesUiStore } from '@/src/store/notesUiStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { loadCachedLabels, saveCachedLabels } from '@/src/cache/labelsCache';
import { loadCachedNotes, saveCachedNotes } from '@/src/cache/notesCache';
import { pullNotes } from '@/src/api/notes';
import { fetchLabels } from '@/src/api/labels';

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
  const [draftServerUrl, setDraftServerUrl] = useState(serverUrl);
  const [draftPassphrase, setDraftPassphrase] = useState(sessionPassphrase);
  const [syncing, setSyncing] = useState(false);

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
    setDraftServerUrl('http://localhost:4000');
    setServerUrl('http://localhost:4000');
  };

  const savePassphrase = () => {
    setSessionPassphrase(draftPassphrase);
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const result = await pullNotes(0);
      await saveCachedNotes(result.notes);
      const labels = result.labels ?? (await fetchLabels());
      await saveCachedLabels(labels);
    } finally {
      setSyncing(false);
    }
  };

  const clearCache = async () => {
    await saveCachedNotes([]);
    await saveCachedLabels([]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <View style={styles.section}>
        <Text variant="titleMedium">Theme</Text>
        <ToggleButton.Row value={theme} onValueChange={(v) => v && setTheme(v as any)} style={styles.row}>
          <ToggleButton icon="theme-light-dark" value="system">
            System
          </ToggleButton>
          <ToggleButton icon="white-balance-sunny" value="light">
            Light
          </ToggleButton>
          <ToggleButton icon="moon-waning-crescent" value="dark">
            Dark
          </ToggleButton>
        </ToggleButton.Row>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium">Default layout</Text>
        <ToggleButton.Row
          value={defaultLayout}
          onValueChange={(v) => v && handleLayoutChange(v as 'list' | 'grid')}
          style={styles.row}>
          <ToggleButton icon="view-agenda-outline" value="list">
            List
          </ToggleButton>
          <ToggleButton icon="view-grid-outline" value="grid">
            Grid
          </ToggleButton>
        </ToggleButton.Row>
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
          The client will use this URL for sync requests.
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
  row: {
    alignSelf: 'flex-start',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
});
