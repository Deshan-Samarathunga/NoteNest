import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text, TextInput } from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';

import { useDatabase } from '@/src/hooks/use-database';
import { LabelsRepo } from '@/src/repositories/labelsRepo';
import { useNotesUiStore } from '@/src/store/notesUiStore';
import { Label } from '@/src/types/models';

export default function LabelsScreen() {
  const db = useDatabase();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const setSelectedLabelId = useNotesUiStore((state) => state.setSelectedLabelId);

  useEffect(() => {
    const load = async () => {
      if (!db) return;
      setLoading(true);
      const repo = new LabelsRepo(db);
      const list = await repo.list();
      setLabels(list);
      setEdits(
        list.reduce<Record<string, string>>((acc, label) => {
          acc[label.id] = label.name;
          return acc;
        }, {})
      );
      setLoading(false);
    };
    load();
  }, [db]);

  const refresh = async () => {
    if (!db) return;
    const repo = new LabelsRepo(db);
    const list = await repo.list();
    setLabels(list);
    setEdits(
      list.reduce<Record<string, string>>((acc, label) => {
        acc[label.id] = label.name;
        return acc;
      }, {})
    );
  };

  const addLabel = async () => {
    if (!db) return;
    const name = newLabel.trim();
    if (!name) return;
    const repo = new LabelsRepo(db);
    await repo.create({ id: uuidv4(), name });
    setNewLabel('');
    refresh();
  };

  const renameLabel = async (id: string) => {
    if (!db) return;
    const name = edits[id]?.trim();
    if (!name) return;
    const repo = new LabelsRepo(db);
    await repo.rename(id, name);
    refresh();
  };

  const deleteLabel = async (id: string) => {
    if (!db) return;
    const repo = new LabelsRepo(db);
    await repo.delete(id);
    refresh();
  };

  if (!db || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Labels' }} />
      <TextInput
        label="New label"
        value={newLabel}
        onChangeText={setNewLabel}
        mode="outlined"
        style={styles.input}
        right={<TextInput.Icon icon="plus" onPress={addLabel} />}
      />
      {labels.length === 0 ? (
        <Text variant="bodyMedium">No labels yet. Create one above.</Text>
      ) : (
        labels.map((label) => (
          <View key={label.id} style={styles.row}>
            <TextInput
              value={edits[label.id]}
              onChangeText={(text) => setEdits((prev) => ({ ...prev, [label.id]: text }))}
              mode="outlined"
              style={styles.labelInput}
            />
            <IconButton icon="content-save" onPress={() => renameLabel(label.id)} />
            <IconButton icon="delete" onPress={() => deleteLabel(label.id)} />
            <Button
              mode="text"
              onPress={() => {
                setSelectedLabelId(label.id);
                router.push('/');
              }}>
              View
            </Button>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  input: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
