import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme, Theme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { Colors } from '@/constants/theme';

export type AppTheme = {
  navigation: Theme;
  paper: MD3Theme;
  statusBarStyle: 'light' | 'dark';
};

const paperLight: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    surface: Colors.light.background,
    secondary: '#6d5bd0',
  },
};

const paperDark: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    surface: Colors.dark.background,
    secondary: '#9f8bff',
  },
};

const navigationLight: Theme = {
  ...NavigationLightTheme,
  colors: {
    ...NavigationLightTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.icon,
    notification: Colors.light.tint,
  },
};

const navigationDark: Theme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.icon,
    notification: Colors.dark.tint,
  },
};

export function getAppTheme(colorScheme: 'light' | 'dark' | null | undefined): AppTheme {
  if (colorScheme === 'dark') {
    return {
      navigation: navigationDark,
      paper: paperDark,
      statusBarStyle: 'light',
    };
  }

  return {
    navigation: navigationLight,
    paper: paperLight,
    statusBarStyle: 'dark',
  };
}
