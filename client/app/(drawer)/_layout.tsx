import { Drawer } from 'expo-router/drawer';
import React from 'react';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
      }}>
      <Drawer.Screen name="index" options={{ title: 'Notes' }} />
      <Drawer.Screen name="archive" options={{ title: 'Archive' }} />
      <Drawer.Screen name="trash" options={{ title: 'Trash' }} />
      <Drawer.Screen name="labels" options={{ title: 'Labels' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}
