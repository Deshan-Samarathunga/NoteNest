import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { IconButton } from 'react-native-paper';

import { Attachment } from '@/src/types/models';

type AttachmentStripProps = {
  attachments: Attachment[];
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onPressAttachment?: (attachment: Attachment) => void;
};

export function AttachmentStrip({
  attachments,
  onAdd,
  onRemove,
  onPressAttachment,
}: AttachmentStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {onAdd ? <IconButton icon="image-plus" mode="contained-tonal" onPress={onAdd} /> : null}
      {attachments.map((attachment) => (
        <View key={attachment.id} style={styles.thumbnail}>
          <Pressable onPress={() => onPressAttachment?.(attachment)}>
            <Image source={{ uri: attachment.uri }} style={styles.image} />
          </Pressable>
          {onRemove ? (
            <IconButton icon="close" size={16} style={styles.remove} onPress={() => onRemove(attachment.id)} />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  thumbnail: {
    position: 'relative',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
});
