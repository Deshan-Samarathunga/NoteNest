import dayjs from 'dayjs';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Switch,
  Text,
  TextInput,
  ToggleButton,
} from 'react-native-paper';

import { useDatabase } from '@/src/hooks/use-database';
import * as ImagePicker from 'expo-image-picker';
import { AttachmentsRepo } from '@/src/repositories/attachmentsRepo';
import { LabelsRepo } from '@/src/repositories/labelsRepo';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { Attachment, ChecklistItem, Label, Note, NoteType } from '@/src/types/models';
import { cancelReminder, ensureNotificationPermissions, scheduleReminder } from '@/src/services/remindersService';
import { ChecklistEditor } from '@/src/ui/components/ChecklistEditor';
import { ColorPicker } from '@/src/ui/components/ColorPicker';
import { LabelPicker } from '@/src/ui/components/LabelPicker';
import { AttachmentStrip } from '@/src/ui/components/AttachmentStrip';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('TEXT');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [trashed, setTrashed] = useState(false);
  const [color, setColor] = useState<number>(0xffffff);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelDialogVisible, setLabelDialogVisible] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reminderInput, setReminderInput] = useState('');
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!db || !id) return;
      setLoading(true);
      const repo = new NotesRepo(db);
      const labelRepo = new LabelsRepo(db);
      const attachmentRepo = new AttachmentsRepo(db);
      const existing = await repo.getById(id);
      const allLabels = await labelRepo.list();
      let noteLabels: Label[] = [];
      let checklist: ChecklistItem[] = [];
      let noteAttachments: Attachment[] = [];
      if (existing) {
        checklist = await repo.getChecklist(existing.id);
        noteLabels = await labelRepo.getLabelsForNote(existing.id);
        noteAttachments = await attachmentRepo.listByNote(existing.id);
      }
      setLabels(allLabels);
      setNote(existing);
      if (existing) {
        setTitle(existing.title ?? '');
        setBody(existing.body ?? '');
        setPinned(existing.pinned);
        setArchived(existing.archived);
        setTrashed(existing.trashed);
        setColor(existing.color);
        setNoteType(existing.type);
        setChecklistItems(checklist);
        setSelectedLabelIds(noteLabels.map((l) => l.id));
        setAttachments(noteAttachments);
        setNotificationId(existing.notificationId ?? null);
        setReminderAt(existing.reminderAt ?? null);
        if (existing.reminderAt) {
          setReminderInput(dayjs(existing.reminderAt).format('YYYY-MM-DD HH:mm'));
        }
      }
      setLoading(false);
    };

    load();
  }, [db, id]);

  const normalizedChecklist = useMemo(
    () =>
      checklistItems
        .map((item, idx) => ({ ...item, sortOrder: idx }))
        .filter((item) => item.text.trim().length > 0 || checklistItems.length === 1),
    [checklistItems]
  );

  const updateNote = async (patch: Partial<Note>) => {
    if (!db || !id) return;
    const repo = new NotesRepo(db);
    await repo.update(id, { ...patch, updatedAt: Date.now() });
  };

  const onSave = async () => {
    if (!note || !db || saving) return;
    const reminderText = reminderInput.trim();
    const parsedReminder = reminderText ? dayjs(reminderText) : null;
    if (parsedReminder && !parsedReminder.isValid()) {
      Alert.alert('Invalid date', 'Use a format like 2024-12-31 17:00');
      return;
    }

    const newReminderAt = parsedReminder ? parsedReminder.valueOf() : null;
    setSaving(true);
    try {
      const repo = new NotesRepo(db);
      const labelRepo = new LabelsRepo(db);
      await db.withTransactionAsync(async () => {
        await repo.update(note.id, {
          title: title.trim() || null,
          body: noteType === 'TEXT' ? body.trim() || null : null,
          color,
          pinned,
          archived,
          trashed,
          type: noteType,
          reminderAt: newReminderAt,
          updatedAt: Date.now(),
        });
        if (noteType === 'CHECKLIST') {
          await repo.replaceChecklist(
            note.id,
            normalizedChecklist.map((item) => ({ ...item, noteId: note.id }))
          );
        } else {
          await repo.replaceChecklist(note.id, []);
        }
        await labelRepo.replaceNoteLabels(note.id, selectedLabelIds);
        const attachmentRepo = new AttachmentsRepo(db);
        await attachmentRepo.replaceForNote(note.id, attachments);

        if (notificationId && newReminderAt !== reminderAt) {
          await cancelReminder(notificationId);
          setNotificationId(null);
        }

        let scheduledId = notificationId;
        if (newReminderAt) {
          const granted = await ensureNotificationPermissions();
          if (granted) {
            scheduledId = await scheduleReminder({
              noteId: note.id,
              reminderAt: newReminderAt,
              title: title || 'Reminder',
              body: body || 'Open your note',
            });
          }
        }

        setReminderAt(newReminderAt);
        setNotificationId(scheduledId ?? null);
        await repo.update(note.id, {
          reminderAt: newReminderAt,
          notificationId: scheduledId ?? null,
          updatedAt: Date.now(),
        });
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const togglePinned = async () => {
    const next = !pinned;
    setPinned(next);
    await updateNote({ pinned: next });
  };

  const toggleArchived = async () => {
    const next = !archived;
    setArchived(next);
    if (next) {
      setTrashed(false);
      await updateNote({ archived: next, trashed: false });
    } else {
      await updateNote({ archived: next });
    }
  };

  const toggleTrashed = async () => {
    const next = !trashed;
    setTrashed(next);
    if (next) {
      setArchived(false);
      setPinned(false);
      if (notificationId) {
        await cancelReminder(notificationId);
        setNotificationId(null);
      }
      await updateNote({ trashed: true, archived: false, pinned: false, notificationId: null });
      router.back();
    } else {
      await updateNote({ trashed: false });
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const attachment: Attachment = {
      id: `${note?.id ?? 'new'}-att-${Date.now()}`,
      noteId: note?.id ?? '',
      uri: asset.uri,
      mimeType: asset.mimeType ?? undefined,
      createdAt: Date.now(),
    };
    setAttachments((prev) => [attachment, ...prev]);
  };

  if (!db || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.loading}>
        <Text>Note not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: note.title || 'Note' }} />
      <ToggleButton.Row
        value={noteType}
        onValueChange={(value) => {
          if (!value) return;
          const next = value as NoteType;
          if (next === 'CHECKLIST' && checklistItems.length === 0) {
            setChecklistItems([
              {
                id: `${note.id}-item-1`,
                noteId: note.id,
                text: body || '',
                checked: false,
                sortOrder: 0,
              },
            ]);
          }
          if (next === 'TEXT' && checklistItems.length > 0) {
            setBody(checklistItems.map((i) => i.text).join('\n'));
          }
          setNoteType(next);
        }}
        style={styles.toggleRow}>
        <ToggleButton icon="note-outline" value="TEXT">
          Text
        </ToggleButton>
        <ToggleButton icon="check-outline" value="CHECKLIST">
          Checklist
        </ToggleButton>
      </ToggleButton.Row>
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
      />
      {noteType === 'TEXT' ? (
        <TextInput
          label="Body"
          value={body}
          onChangeText={setBody}
          style={styles.input}
          multiline
          numberOfLines={6}
          mode="outlined"
        />
      ) : (
        <ChecklistEditor
          items={checklistItems}
          onToggle={(id) =>
            setChecklistItems((prev) =>
              prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
            )
          }
          onChangeText={(id, text) =>
            setChecklistItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)))
          }
          onAddItem={() =>
            setChecklistItems((prev) => [
              ...prev,
              { id: `${note.id}-${prev.length + 1}`, noteId: note.id, text: '', checked: false, sortOrder: prev.length },
            ])
          }
          onRemoveItem={(id) => setChecklistItems((prev) => prev.filter((item) => item.id !== id))}
          onMoveUp={(id) =>
            setChecklistItems((prev) => {
              const index = prev.findIndex((i) => i.id === id);
              if (index <= 0) return prev;
              const next = [...prev];
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              return next;
            })
          }
          onMoveDown={(id) =>
            setChecklistItems((prev) => {
              const index = prev.findIndex((i) => i.id === id);
              if (index === -1 || index >= prev.length - 1) return prev;
              const next = [...prev];
              [next[index], next[index + 1]] = [next[index + 1], next[index]];
              return next;
            })
          }
        />
      )}
      <View style={styles.row}>
        <Text>Pin</Text>
        <Switch value={pinned} onValueChange={togglePinned} />
      </View>
      <View style={styles.row}>
        <Text>Archive</Text>
        <Switch value={archived} onValueChange={toggleArchived} />
      </View>
      <View style={styles.row}>
        <Text>Trash</Text>
        <Switch value={trashed} onValueChange={toggleTrashed} />
      </View>
      <View style={styles.section}>
        <Text variant="labelLarge">Color</Text>
        <ColorPicker selectedColor={color} onSelect={setColor} />
      </View>
      <View style={styles.section}>
        <Text variant="labelLarge">Attachments</Text>
        <AttachmentStrip
          attachments={attachments}
          onAdd={pickImage}
          onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
        />
      </View>
      <View style={styles.section}>
        <Text variant="labelLarge">Reminder (YYYY-MM-DD HH:mm)</Text>
        <TextInput
          placeholder="e.g. 2025-01-01 09:30"
          value={reminderInput}
          onChangeText={setReminderInput}
          mode="outlined"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Button mode="outlined" onPress={() => setLabelDialogVisible(true)}>
          Labels ({selectedLabelIds.length})
        </Button>
      </View>
      <Button mode="contained" onPress={onSave} loading={saving} disabled={saving} style={styles.save}>
        Save
      </Button>
      <Portal>
        <Dialog visible={labelDialogVisible} onDismiss={() => setLabelDialogVisible(false)}>
          <Dialog.Title>Labels</Dialog.Title>
          <Dialog.Content>
            <LabelPicker
              labels={labels}
              selectedIds={selectedLabelIds}
              onToggle={(labelId) =>
                setSelectedLabelIds((prev) =>
                  prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
                )
              }
              onManageLabels={() => router.push('/(drawer)/labels')}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLabelDialogVisible(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  toggleRow: {
    alignSelf: 'flex-start',
  },
  input: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: 8,
  },
  save: {
    marginTop: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
