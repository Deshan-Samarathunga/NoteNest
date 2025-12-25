import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Checkbox, IconButton, TextInput } from 'react-native-paper';

import { ChecklistItem } from '@/src/types/models';

type ChecklistEditorProps = {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

export function ChecklistEditor({
  items,
  onToggle,
  onChangeText,
  onAddItem,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
}: ChecklistEditorProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Checkbox status={item.checked ? 'checked' : 'unchecked'} onPress={() => onToggle(item.id)} />
            <TextInput
              mode="flat"
              dense
              value={item.text}
              onChangeText={(text) => onChangeText(item.id, text)}
              style={styles.input}
              underlineColor="transparent"
            />
            <IconButton icon="arrow-up" onPress={() => onMoveUp(item.id)} />
            <IconButton icon="arrow-down" onPress={() => onMoveDown(item.id)} />
            <IconButton icon="delete-outline" onPress={() => onRemoveItem(item.id)} />
          </View>
        )}
        ListFooterComponent={
          <IconButton icon="plus" accessibilityLabel="Add checklist item" onPress={onAddItem} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
