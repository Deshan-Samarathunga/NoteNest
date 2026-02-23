import { useFocusEffect, Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, FAB, Searchbar, SegmentedButtons, Text, ToggleButton } from 'react-native-paper';

import { AttachmentMeta, Label, NotePayload } from '@/src/api/types';
import { getAllNotes } from '@/src/db/notesRepo';
import { getLabels } from '@/src/db/labelsRepo';
import { runSync } from '@/src/services/syncService';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useNotesUiStore } from '@/src/store/notesUiStore';
import { EmptyState } from '@/src/ui/components/EmptyState';
import { NoteCard } from '@/src/ui/components/NoteCard';

const FILTER_COLORS: number[] = [0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7];
const colorIntToHex = (value: number | undefined) =>
  `#${(value ?? 0xffffff).toString(16).padStart(6, '0')}`;

export default function HomeScreen() {
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [attachments, setAttachments] = useState<Record<string, AttachmentMeta[]>>({});
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
  const labelMap = useMemo(
    () =>
      labels.reduce<Record<string, Label>>((acc, label) => {
        acc[label.id] = label;
        return acc;
      }, {}),
    [labels]
  );

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      await runSync();
    } catch {
      // ignore sync failures; show cached data
    }
    const localNotes = await getAllNotes();
    const localLabels = await getLabels();
    setNotes(localNotes);
    setLabels(localLabels);
    const attachmentMap: Record<string, AttachmentMeta[]> = {};
    localNotes.forEach((n) => {
      if (n.attachments) attachmentMap[n.id] = n.attachments;
    });
    setAttachments(attachmentMap);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setLayout(defaultLayout);
    loadNotes();
  }, [loadNotes, defaultLayout, setLayout]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const filtered = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.trashed) return false;
        if (n.archived) return false;
        if (selectedLabelId && !(n.labels || []).includes(selectedLabelId)) return false;
        if (colorFilter !== null && colorFilter !== undefined && n.color !== colorFilter) return false;
        if (showPinnedOnly && !n.pinned) return false;
        if (search.trim()) {
          const term = search.trim().toLowerCase();
          const body = n.body || '';
          const title = n.title || '';
          const checklistText = (n.checklist || []).map((i) => i.text).join(' ');
          return (
            title.toLowerCase().includes(term) ||
            body.toLowerCase().includes(term) ||
            checklistText.toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const sortField = sortBy === 'createdAt' ? 'createdAt' : 'updatedAt';
        return (b[sortField] || 0) - (a[sortField] || 0);
      });
  }, [notes, selectedLabelId, colorFilter, showPinnedOnly, search, sortBy]);

  const filteredPinned = useMemo(() => filtered.filter((n) => n.pinned), [filtered]);
  const filteredOthers = useMemo(() => filtered.filter((n) => !n.pinned), [filtered]);

  const renderNotes = (items: NotePayload[]) => {
    if (items.length === 0) {
      return null;
    }

    if (layout === 'grid') {
      return (
        <View style={styles.grid}>
          {items.map((note) => (
            <NoteCard
              key={note.id}
              note={note as any}
              labels={(note.labels || [])
                .map((id) => labelMap[id])
                .filter((l): l is Label => Boolean(l))}
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
            note={note as any}
            labels={(note.labels || [])
              .map((id) => labelMap[id])
              .filter((l): l is Label => Boolean(l))}
            attachments={attachments[note.id]}
            onPress={() => router.push(`/note/${note.id}`)}
          />
        ))}
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes().finally(() => setRefreshing(false));
  };

  if (loading) {
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
      <SegmentedButtons
        value={sortBy}
        onValueChange={(value) => value && setSortBy(value as 'updatedAt' | 'createdAt')}
        buttons={[
          { value: 'updatedAt', label: 'Updated', icon: 'update' },
          { value: 'createdAt', label: 'Created', icon: 'calendar' },
        ]}
        style={styles.sortRow}
      />
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
            accessibilityLabel={`Filter notes by color ${colorIntToHex(c)}`}
            style={[styles.colorChip, { backgroundColor: colorIntToHex(c) }]}
          >
            {' '}
          </Chip>
        ))}
      </ScrollView>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}>
        {filteredPinned.length > 0 ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              PINNED
            </Text>
            {renderNotes(filteredPinned)}
          </View>
        ) : null}

        <View style={styles.section}>
          {filteredOthers.length > 0 ? (
            renderNotes(filteredOthers)
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
