import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/src/api/labels';
import { Label } from '@/src/api/types';
import { getLabels, replaceLabels } from '@/src/db/labelsRepo';
import { useNotesUiStore } from '@/src/store/notesUiStore';

export default function LabelsScreen() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const setSelectedLabelId = useNotesUiStore((state) => state.setSelectedLabelId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const remote = await fetchLabels();
        setLabels(remote);
        setEdits(
          remote.reduce<Record<string, string>>((acc, l) => {
            acc[l.id] = l.name;
            return acc;
          }, {})
        );
        await replaceLabels(remote);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addLabel = async () => {
    const name = newLabel.trim();
    if (!name) return;
    const created = await createLabel(name);
    const next = [...labels, created];
    setLabels(next);
    setEdits((prev) => ({ ...prev, [created.id]: created.name }));
    setNewLabel('');
    await replaceLabels(next);
  };

  const renameLabel = async (id: string) => {
    const name = edits[id]?.trim();
    if (!name) return;
    const updated = await updateLabel(id, name);
    const next = labels.map((l) => (l.id === id ? updated : l));
    setLabels(next);
    await replaceLabels(next);
  };

  const removeLabel = async (id: string) => {
    await deleteLabel(id);
    const next = labels.filter((l) => l.id !== id);
    setLabels(next);
    await replaceLabels(next);
  };

  if (loading && labels.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Labels' }} />
        <Text>Loading...</Text>
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
        <Text>No labels yet.</Text>
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
            <IconButton icon="delete" onPress={() => removeLabel(label.id)} />
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
});
