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
import * as ImagePicker from 'expo-image-picker';

import { uploadAttachmentFromUri } from '@/src/api/attachments';
import { AttachmentMeta, ChecklistItem, Label, NotePayload } from '@/src/api/types';
import { fetchLabels } from '@/src/api/labels';
import { cancelReminder, ensureNotificationPermissions, scheduleReminder } from '@/src/services/remindersService';
import { ChecklistEditor } from '@/src/ui/components/ChecklistEditor';
import { ColorPicker } from '@/src/ui/components/ColorPicker';
import { AttachmentStrip } from '@/src/ui/components/AttachmentStrip';
import { LabelPicker } from '@/src/ui/components/LabelPicker';
import { getLabels, replaceLabels } from '@/src/db/labelsRepo';
import { getNote as loadNote, saveNote } from '@/src/db/notesRepo';
import { queueAndSave, runSync } from '@/src/services/syncService';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<NotePayload | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<'TEXT' | 'CHECKLIST'>('TEXT');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [trashed, setTrashed] = useState(false);
  const [color, setColor] = useState<number>(0xffffff);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [reminderInput, setReminderInput] = useState('');
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelDialogVisible, setLabelDialogVisible] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const found = (await loadNote(id)) || null;
      setNote(found);
      if (found) {
        setTitle(found.title ?? '');
        setBody(found.body ?? '');
        setPinned(Boolean(found.pinned));
        setArchived(Boolean(found.archived));
        setTrashed(Boolean(found.trashed));
        setColor(found.color ?? 0xffffff);
        setNoteType(found.type ?? 'TEXT');
        setChecklistItems(found.checklist ?? []);
        setAttachments(found.attachments ?? []);
        setNotificationId(found.notificationId ?? null);
        setReminderAt(found.reminderAt ?? null);
        setSelectedLabelIds(found.labels ?? []);
        if (found.reminderAt) {
          setReminderInput(dayjs(found.reminderAt).format('YYYY-MM-DD HH:mm'));
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const normalizedChecklist = useMemo(
    () =>
      checklistItems
        .map((item, idx) => ({ ...item, sortOrder: idx }))
        .filter((item) => item.text.trim().length > 0 || checklistItems.length === 1),
    [checklistItems]
  );

  useEffect(() => {
    (async () => {
      try {
        const remote = await fetchLabels();
        setLabels(remote);
        await replaceLabels(remote);
      } catch {
        const cached = await getLabels();
        setLabels(cached);
      }
    })();
  }, []);

  const onSave = async () => {
    if (!note || saving) return;
    const reminderText = reminderInput.trim();
    const parsedReminder = reminderText ? dayjs(reminderText) : null;
    if (parsedReminder && !parsedReminder.isValid()) {
      Alert.alert('Invalid date', 'Use a format like 2024-12-31 17:00');
      return;
    }

    const newReminderAt = parsedReminder ? parsedReminder.valueOf() : null;
    setSaving(true);
    try {
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

      const updated: NotePayload = {
        ...note,
        title: title.trim() || null,
        body: noteType === 'TEXT' ? body.trim() || null : null,
        type: noteType,
        createdAt: note.createdAt ?? note.updatedAt ?? Date.now(),
        checklist: noteType === 'CHECKLIST' ? normalizedChecklist : [],
        labels: selectedLabelIds,
        color,
        pinned,
        archived,
        trashed,
        attachments,
        reminderAt: newReminderAt,
        notificationId: scheduledId ?? null,
        updatedAt: Date.now(),
      };

      await queueAndSave(updated);
      await runSync();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const toggleTrashed = async () => {
    const next = !trashed;
    setTrashed(next);
    if (next && notificationId) {
      await cancelReminder(notificationId);
      setNotificationId(null);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    setUploadingAttachment(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) {
      setUploadingAttachment(false);
      return;
    }
    const asset = result.assets[0];
    try {
      const uploaded = await uploadAttachmentFromUri(asset.uri, asset.mimeType);
      setAttachments((prev) => [uploaded, ...prev]);
    } catch (err) {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
      console.error(err);
    } finally {
      setUploadingAttachment(false);
    }
  };

  if (loading) {
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
          const next = value as 'TEXT' | 'CHECKLIST';
          if (next === 'CHECKLIST' && checklistItems.length === 0) {
            setChecklistItems([
              {
                id: `${note.id}-item-1`,
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
              { id: `${note.id}-${prev.length + 1}`, text: '', checked: false, sortOrder: prev.length },
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
        {uploadingAttachment ? <Text>Uploading attachment...</Text> : null}
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
                setSelectedLabelIds((prev) => (prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]))
              }
              onManageLabels={() => {
                setLabelDialogVisible(false);
                router.push('/labels');
              }}
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
