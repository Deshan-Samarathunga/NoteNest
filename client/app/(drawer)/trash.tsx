import { useFocusEffect, Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';

import { pushNotes } from '@/src/api/notes';
import { AttachmentMeta, Label, NotePayload } from '@/src/api/types';
import { fetchLabels } from '@/src/api/labels';
import { loadCachedLabels, saveCachedLabels } from '@/src/cache/labelsCache';
import { loadCachedNotes, saveCachedNotes } from '@/src/cache/notesCache';
import { purgeOldTrashed } from '@/src/services/purgeService';
import { useSettingsStore } from '@/src/store/settingsStore';
import { NoteCard } from '@/src/ui/components/NoteCard';

export default function TrashScreen() {
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [attachments, setAttachments] = useState<Record<string, AttachmentMeta[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const purgeDays = useSettingsStore((s) => s.purgeDays);

  const trashed = useMemo(() => notes.filter((n) => n.trashed && !n.deleted), [notes]);

  const loadData = useCallback(async () => {
    const cachedNotes = await loadCachedNotes();
    const cachedLabels = await loadCachedLabels();
    setNotes(cachedNotes);
    setLabels(cachedLabels);
    const attachmentMap: Record<string, AttachmentMeta[]> = {};
    cachedNotes.forEach((n) => {
      if (n.attachments) attachmentMap[n.id] = n.attachments;
    });
    setAttachments(attachmentMap);
    try {
      const remoteLabels = await fetchLabels();
      setLabels(remoteLabels);
      await saveCachedLabels(remoteLabels);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await purgeOldTrashed(purgeDays).catch(() => undefined);
    await loadData();
    setRefreshing(false);
  }, [loadData, purgeDays]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const updateCache = async (updater: (current: NotePayload[]) => NotePayload[]) => {
    const current = await loadCachedNotes();
    const next = updater(current);
    await saveCachedNotes(next);
    setNotes(next);
  };

  const restore = async (note: NotePayload) => {
    const updated: NotePayload = { ...note, trashed: false, updatedAt: Date.now() };
    await pushNotes([updated]);
    await updateCache((cur) => cur.map((n) => (n.id === note.id ? updated : n)));
  };

  const deleteForever = async (note: NotePayload) => {
    const updated: NotePayload = { ...note, trashed: true, deleted: true, updatedAt: Date.now() };
    await pushNotes([updated]);
    await updateCache((cur) => cur.filter((n) => n.id !== note.id));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Stack.Screen options={{ title: 'Trash' }} />
      {trashed.length === 0 ? (
        <Text>No trashed notes.</Text>
      ) : (
        trashed.map((note) => (
          <View key={note.id} style={styles.cardBlock}>
            <NoteCard
              note={note}
              attachments={attachments[note.id]}
              labels={(note.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[]}
            />
            <View style={styles.actions}>
              <Button mode="outlined" onPress={() => restore(note)}>
                Restore
              </Button>
              <Button mode="text" onPress={() => deleteForever(note)}>
                Delete forever
              </Button>
            </View>
            <Divider />
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  cardBlock: {
    gap: 8,
  },
});
