import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { RadioButton, Text, ToggleButton } from 'react-native-paper';

import { useNotesUiStore } from '@/src/store/notesUiStore';
import { useSettingsStore } from '@/src/store/settingsStore';

export default function SettingsScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const purgeDays = useSettingsStore((s) => s.purgeDays);
  const setPurgeDays = useSettingsStore((s) => s.setPurgeDays);
  const defaultLayout = useSettingsStore((s) => s.defaultLayout);
  const setDefaultLayout = useSettingsStore((s) => s.setDefaultLayout);
  const setCurrentLayout = useNotesUiStore((s) => s.setLayout);

  const handleLayoutChange = (layout: 'list' | 'grid') => {
    setDefaultLayout(layout);
    setCurrentLayout(layout);
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
});
