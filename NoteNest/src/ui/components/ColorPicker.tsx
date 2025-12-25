import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type ColorPickerProps = {
  selectedColor: number;
  onSelect: (color: number) => void;
};

const COLOR_SWATCHES: number[] = [
  0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7, 0xd7ccc8, 0xb3e5fc,
];

const colorIntToHex = (value: number) => `#${value.toString(16).padStart(6, '0')}`;

export function ColorPicker({ selectedColor, onSelect }: ColorPickerProps) {
  return (
    <View style={styles.row}>
      {COLOR_SWATCHES.map((color) => {
        const isSelected = color === selectedColor;
        return (
          <Pressable
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: colorIntToHex(color), borderColor: isSelected ? '#000' : '#ccc' },
              isSelected && styles.selected,
            ]}
            onPress={() => onSelect(color)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    height: 36,
    width: 36,
    borderRadius: 12,
    borderWidth: 2,
  },
  selected: {
    transform: [{ scale: 1.05 }],
  },
});
