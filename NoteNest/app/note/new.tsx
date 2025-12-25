import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
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
import { v4 as uuidv4 } from 'uuid';

import { useDatabase } from '@/src/hooks/use-database';
import { AttachmentsRepo } from '@/src/repositories/attachmentsRepo';
import { LabelsRepo } from '@/src/repositories/labelsRepo';
import { NotesRepo } from '@/src/repositories/notesRepo';
import { Attachment, ChecklistItem, Label, Note, NoteType } from '@/src/types/models';
import { ensureNotificationPermissions, scheduleReminder } from '@/src/services/remindersService';
import { ChecklistEditor } from '@/src/ui/components/ChecklistEditor';
import { ColorPicker } from '@/src/ui/components/ColorPicker';
import { LabelPicker } from '@/src/ui/components/LabelPicker';
import { AttachmentStrip } from '@/src/ui/components/AttachmentStrip';

const DEFAULT_COLOR = 0xffffff;

export default function NewNoteScreen() {
  const db = useDatabase();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('TEXT');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [color, setColor] = useState<number>(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelDialogVisible, setLabelDialogVisible] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reminderInput, setReminderInput] = useState('');

  useEffect(() => {
    const loadLabels = async () => {
      if (!db) return;
      const repo = new LabelsRepo(db);
      const list = await repo.list();
      setLabels(list);
    };
    loadLabels();
  }, [db]);

  const normalizedChecklist = useMemo(
    () =>
      checklistItems
        .map((item, idx) => ({ ...item, sortOrder: idx }))
        .filter((item) => item.text.trim().length > 0 || checklistItems.length === 1),
    [checklistItems]
  );

  const onSave = async () => {
    if (!db || saving) return;
    const reminderText = reminderInput.trim();
    const reminderDate = reminderText ? dayjs(reminderText) : null;
    if (reminderDate && !reminderDate.isValid()) {
      Alert.alert('Invalid date', 'Use a format like 2024-12-31 17:00');
      return;
    }

    setSaving(true);
    const now = Date.now();
    let reminderAt = reminderDate ? reminderDate.valueOf() : null;
    if (reminderAt) {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        reminderAt = null;
      }
    }

    const note: Note = {
      id: uuidv4(),
      title: title.trim() || null,
      body: noteType === 'TEXT' ? body.trim() || null : null,
      type: noteType,
      color,
      pinned,
      archived,
      trashed: false,
      reminderAt,
      notificationId: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const repo = new NotesRepo(db);
      const labelRepo = new LabelsRepo(db);
      const attachmentRepo = new AttachmentsRepo(db);
      await db.withTransactionAsync(async () => {
        await repo.create(note);
        if (noteType === 'CHECKLIST') {
          await repo.replaceChecklist(
            note.id,
            normalizedChecklist.map((item) => ({ ...item, noteId: note.id }))
          );
        } else {
          await repo.replaceChecklist(note.id, []);
        }
        for (const labelId of selectedLabelIds) {
          await labelRepo.assignToNote(note.id, labelId);
        }
        for (const attachment of attachments) {
          await attachmentRepo.create({ ...attachment, noteId: note.id });
        }
        if (reminderAt) {
          const scheduledId =
            notificationId ||
            (await scheduleReminder({
              noteId: note.id,
              reminderAt,
              title: note.title || 'Reminder',
              body: note.body || 'Open your note',
            }));
          if (scheduledId) {
            await repo.update(note.id, { notificationId: scheduledId, updatedAt: Date.now() });
          }
        }
      });
      router.replace(`/note/${note.id}`);
    } finally {
      setSaving(false);
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
      id: uuidv4(),
      noteId: '',
      uri: asset.uri,
      mimeType: asset.mimeType ?? undefined,
      createdAt: Date.now(),
    };
    setAttachments((prev) => [attachment, ...prev]);
  };

  if (!db) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'New note' }} />
      <ToggleButton.Row
        value={noteType}
        onValueChange={(value) => {
          if (!value) return;
          const next = value as NoteType;
          if (next === 'CHECKLIST' && checklistItems.length === 0) {
            setChecklistItems([
              {
                id: uuidv4(),
                noteId: '',
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
              { id: uuidv4(), noteId: '', text: '', checked: false, sortOrder: prev.length },
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
        <Switch value={pinned} onValueChange={setPinned} />
      </View>
      <View style={styles.row}>
        <Text>Archive</Text>
        <Switch value={archived} onValueChange={setArchived} />
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
