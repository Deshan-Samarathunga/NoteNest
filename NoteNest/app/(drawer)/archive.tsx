import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { useDatabase } from '@/src/hooks/use-database';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { Note } from '@/src/types/models';
import { EmptyState } from '@/src/ui/components/EmptyState';
import { NoteCard } from '@/src/ui/components/NoteCard';

export default function ArchiveScreen() {
  const db = useDatabase();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const repo = new NotesRepo(db);
    const list = await repo.list({ archivedOnly: true });
    setNotes(list);
    setLoading(false);
    setRefreshing(false);
  }, [db]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const unarchive = async (noteId: string) => {
    if (!db) return;
    const repo = new NotesRepo(db);
    await repo.update(noteId, { archived: false, updatedAt: Date.now() });
    loadNotes();
  };

  if (!db || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Archive' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {notes.length === 0 ? (
          <EmptyState title="No archived notes" description="Notes you archive will appear here." />
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.cardRow}>
              <NoteCard note={note} style={styles.card} />
              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => unarchive(note.id)}>
                  Unarchive
                </Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  cardRow: {
    gap: 8,
  },
  card: {
    marginVertical: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
