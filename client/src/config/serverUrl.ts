import { Platform } from 'react-native';

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

export function getDefaultServerUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) return normalizeUrl(envUrl);
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}
