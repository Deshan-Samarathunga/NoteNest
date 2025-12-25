import { useFocusEffect } from 'expo-router';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, FAB, Searchbar, Text, ToggleButton } from 'react-native-paper';

import { useDatabase } from '@/src/hooks/use-database';
import { AttachmentsRepo } from '@/src/repositories/attachmentsRepo';
import { LabelsRepo } from '@/src/repositories/labelsRepo';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useNotesUiStore } from '@/src/store/notesUiStore';
import { Attachment, Label, Note } from '@/src/types/models';
import { EmptyState } from '@/src/ui/components/EmptyState';
import { NoteCard } from '@/src/ui/components/NoteCard';

const FILTER_COLORS: number[] = [0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7];
const colorIntToHex = (value: number | undefined) =>
  `#${(value ?? 0xffffff).toString(16).padStart(6, '0')}`;

export default function HomeScreen() {
  const db = useDatabase();
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const layout = useNotesUiStore((state) => state.layout);
  const setLayout = useNotesUiStore((state) => state.setLayout);
  const search = useNotesUiStore((state) => state.search);
  const setSearch = useNotesUiStore((state) => state.setSearch);
  const selectedLabelId = useNotesUiStore((state) => state.selectedLabelId);
  const setSelectedLabelId = useNotesUiStore((state) => state.setSelectedLabelId);
  const colorFilter = useNotesUiStore((state) => state.colorFilter);
  const setColorFilter = useNotesUiStore((state) => state.setColorFilter);
  const showPinnedOnly = useNotesUiStore((state) => state.showPinnedOnly);
  const setShowPinnedOnly = useNotesUiStore((state) => state.setShowPinnedOnly);
  const resetFilters = useNotesUiStore((state) => state.resetFilters);
  const sortBy = useNotesUiStore((state) => state.sortBy);
  const setSortBy = useNotesUiStore((state) => state.setSortBy);
  const defaultLayout = useSettingsStore((s) => s.defaultLayout);

  const loadLabels = useCallback(async () => {
    if (!db) return;
    const repo = new LabelsRepo(db);
    const list = await repo.list();
    setLabels(list);
  }, [db]);

  const loadNotes = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const repo = new NotesRepo(db);
      const attachmentsRepo = new AttachmentsRepo(db);
      const results = await repo.list({
        search,
        labelId: selectedLabelId ?? undefined,
        color: colorFilter ?? undefined,
        includePinned: showPinnedOnly ? true : undefined,
        includeArchived: false,
        includeTrashed: false,
        sortBy,
      });
      setNotes(results);
      const attachmentMap = await attachmentsRepo.listByNoteIds(results.map((n) => n.id));
      setAttachments(attachmentMap);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, search, selectedLabelId, colorFilter, showPinnedOnly]);

  useEffect(() => {
    setLayout(defaultLayout);
    loadNotes();
    loadLabels();
  }, [loadNotes, loadLabels, defaultLayout, setLayout]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadLabels();
    }, [loadNotes, loadLabels])
  );

  const pinned = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const others = useMemo(() => notes.filter((n) => !n.pinned), [notes]);

  const renderNotes = (items: Note[]) => {
    if (items.length === 0) {
      return null;
    }

    if (layout === 'grid') {
      return (
        <View style={styles.grid}>
          {items.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              attachments={attachments[note.id]}
              style={styles.gridCard}
              onPress={() => router.push(`/note/${note.id}`)}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.column}>
        {items.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            attachments={attachments[note.id]}
            onPress={() => router.push(`/note/${note.id}`)}
          />
        ))}
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadLabels(), loadNotes()]).finally(() => setRefreshing(false));
  };

  if (!db || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Notes' }} />
      <Searchbar
        placeholder="Search notes"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        autoCapitalize="sentences"
        onSubmitEditing={loadNotes}
      />
      <ToggleButton.Row
        value={layout}
        onValueChange={(value) => value && setLayout(value as 'list' | 'grid')}
        style={styles.toggleRow}>
        <ToggleButton icon="view-agenda-outline" value="list" />
        <ToggleButton icon="view-grid-outline" value="grid" />
      </ToggleButton.Row>
      <ToggleButton.Row
        value={sortBy}
        onValueChange={(value) => value && setSortBy(value as 'updatedAt' | 'createdAt')}
        style={styles.sortRow}>
        <ToggleButton icon="update" value="updatedAt">
          Updated
        </ToggleButton>
        <ToggleButton icon="calendar" value="createdAt">
          Created
        </ToggleButton>
      </ToggleButton.Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip selected={!selectedLabelId && !colorFilter && !showPinnedOnly} onPress={resetFilters}>
          All
        </Chip>
        <Chip selected={showPinnedOnly} onPress={() => setShowPinnedOnly(!showPinnedOnly)}>
          Pinned
        </Chip>
        {labels.map((label) => (
          <Chip
            key={label.id}
            selected={selectedLabelId === label.id}
            onPress={() => setSelectedLabelId(selectedLabelId === label.id ? null : label.id)}>
            {label.name}
          </Chip>
        ))}
        {FILTER_COLORS.map((c) => (
          <Chip
            key={c}
            selected={colorFilter === c}
            onPress={() => setColorFilter(colorFilter === c ? null : c)}
            style={[styles.colorChip, { backgroundColor: colorIntToHex(c) }]}
          />
        ))}
      </ScrollView>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}>
        {pinned.length > 0 ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              PINNED
            </Text>
            {renderNotes(pinned)}
          </View>
        ) : null}

        <View style={styles.section}>
          {others.length > 0 ? (
            renderNotes(others)
          ) : (
            <EmptyState
              title="No notes yet"
              description="Create a note to get started."
              actionLabel="New note"
              onAction={() => router.push('/note/new')}
            />
          )}
        </View>
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/note/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  toggleRow: {
    marginHorizontal: 16,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  sortRow: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  section: {
    marginTop: 12,
    gap: 8,
  },
  sectionLabel: {
    marginBottom: 4,
    color: '#6b6b6b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard: {
    width: '48%',
  },
  colorChip: {
    minWidth: 36,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  column: {
    gap: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
