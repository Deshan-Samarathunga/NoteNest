import { Stack } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function ArchiveScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Archive' }} />
      <Text>Archive view will be wired after sync cache is fully implemented.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
