import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { v4 as uuidv4 } from 'uuid';

import { uploadAttachmentFromUri } from '@/src/api/attachments';
import { AttachmentMeta, ChecklistItem, Label, NotePayload } from '@/src/api/types';
import { fetchLabels } from '@/src/api/labels';
import { ensureNotificationPermissions, scheduleReminder } from '@/src/services/remindersService';
import { ChecklistEditor } from '@/src/ui/components/ChecklistEditor';
import { ColorPicker } from '@/src/ui/components/ColorPicker';
import { AttachmentStrip } from '@/src/ui/components/AttachmentStrip';
import { LabelPicker } from '@/src/ui/components/LabelPicker';
import { getLabels, replaceLabels } from '@/src/db/labelsRepo';
import { queueAndSave, runSync } from '@/src/services/syncService';

const DEFAULT_COLOR = 0xffffff;

export default function NewNoteScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<'TEXT' | 'CHECKLIST'>('TEXT');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [color, setColor] = useState<number>(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [reminderInput, setReminderInput] = useState('');
  const [labelDialogVisible, setLabelDialogVisible] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  useEffect(() => {
    const loadLabels = async () => {
      try {
        const remote = await fetchLabels();
        setLabels(remote);
        await replaceLabels(remote);
      } catch {
        const cached = await getLabels();
        if (cached.length) setLabels(cached);
        // best effort
      }
    };
    loadLabels();
  }, []);

  const normalizedChecklist = useMemo(
    () =>
      checklistItems
        .map((item, idx) => ({ ...item, sortOrder: idx }))
        .filter((item) => item.text.trim().length > 0 || checklistItems.length === 1),
    [checklistItems]
  );

  const onSave = async () => {
    if (saving) return;
    const reminderText = reminderInput.trim();
    const reminderDate = reminderText ? dayjs(reminderText) : null;
    if (reminderDate && !reminderDate.isValid()) {
      Alert.alert('Invalid date', 'Use a format like 2024-12-31 17:00');
      return;
    }

    setSaving(true);
    const noteId = uuidv4();
    const now = Date.now();
    let reminderAt = reminderDate ? reminderDate.valueOf() : null;
    let notificationId: string | null = null;
    if (reminderAt) {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        reminderAt = null;
      } else {
        notificationId = await scheduleReminder({
          noteId,
          reminderAt,
          title: title || 'Reminder',
          body: body || 'Open your note',
        });
      }
    }

    const note: NotePayload = {
      id: noteId,
      title: title.trim() || null,
      body: noteType === 'TEXT' ? body.trim() || null : null,
      type: noteType,
      createdAt: now,
      checklist: noteType === 'CHECKLIST' ? normalizedChecklist : [],
      labels: selectedLabelIds,
      color,
      pinned,
      archived,
      trashed: false,
      reminderAt,
      notificationId,
      attachments,
      updatedAt: now,
    };

    try {
      await queueAndSave(note);
      await runSync();
      router.replace(`/note/${note.id}`);
    } catch (err) {
      Alert.alert('Save failed', 'Could not save the note. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'New note' }} />
      <SegmentedButtons
        value={noteType}
        onValueChange={(value) => {
          if (!value) return;
          const next = value as 'TEXT' | 'CHECKLIST';
          if (next === 'CHECKLIST' && checklistItems.length === 0) {
            setChecklistItems([
              {
                id: uuidv4(),
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
        buttons={[
          { value: 'TEXT', label: 'Text', icon: 'note-outline' },
          { value: 'CHECKLIST', label: 'Checklist', icon: 'check-outline' },
        ]}
        style={styles.toggleRow}
      />
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
              { id: uuidv4(), text: '', checked: false, sortOrder: prev.length },
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
              onToggle={(id) =>
                setSelectedLabelIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]))
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
