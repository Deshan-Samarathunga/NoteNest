import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Checkbox, List, Text } from 'react-native-paper';

import { Label } from '@/src/api/types';

type LabelPickerProps = {
  labels: Array<Pick<Label, 'id' | 'name'>>;
  selectedIds: string[];
  onToggle: (labelId: string) => void;
  onManageLabels?: () => void;
};

export function LabelPicker({ labels, selectedIds, onToggle, onManageLabels }: LabelPickerProps) {
  const selected = new Set(selectedIds);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <List.Section>
        <List.Subheader>Labels</List.Subheader>
        {labels.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            No labels yet
          </Text>
        ) : (
          labels.map((label) => {
            const isChecked = selected.has(label.id);
            return (
              <List.Item
                key={label.id}
                title={label.name}
                left={() => (
                  <Checkbox status={isChecked ? 'checked' : 'unchecked'} onPress={() => onToggle(label.id)} />
                )}
                onPress={() => onToggle(label.id)}
              />
            );
          })
        )}
      </List.Section>
      {onManageLabels ? (
        <Button mode="text" onPress={onManageLabels}>
          Manage labels
        </Button>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
