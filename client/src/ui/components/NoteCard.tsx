import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Card, Chip, Text } from 'react-native-paper';

import { AttachmentMeta, Label, NotePayload } from '@/src/api/types';

type NoteCardProps = {
  note: NotePayload;
  labels?: Array<Pick<Label, 'id' | 'name'>>;
  attachments?: AttachmentMeta[];
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const colorIntToHex = (value: number | undefined) =>
  `#${(value ?? 0xffffff).toString(16).padStart(6, '0')}`;

export function NoteCard({
  note,
  labels = [],
  attachments = [],
  onPress,
  onLongPress,
  style,
}: NoteCardProps) {
  const hasBody = Boolean(note.body?.trim());
  const previewAttachments = attachments.slice(0, 3);

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { backgroundColor: colorIntToHex(note.color) }, style]}>
      <Card.Title title={note.title || 'Untitled'} titleNumberOfLines={2} />
      {hasBody ? (
        <Card.Content>
          <Text variant="bodyMedium" numberOfLines={6}>
            {note.body}
          </Text>
        </Card.Content>
      ) : null}
      {previewAttachments.length > 0 ? (
        <Card.Content>
          <View style={styles.attachmentsRow}>
            {previewAttachments.map((attachment) => (
              <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.attachment} />
            ))}
          </View>
        </Card.Content>
      ) : null}
      {labels.length > 0 ? (
        <Card.Content style={styles.labelsRow}>
          {labels.map((label) => (
            <Chip key={label.id} compact style={styles.chip}>
              {label.name}
            </Chip>
          ))}
        </Card.Content>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  attachmentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  attachment: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
});
