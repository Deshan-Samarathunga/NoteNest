import { useSettingsStore } from '@/src/store/settingsStore';
import { getDefaultServerUrl } from '@/src/config/serverUrl';

export function getServerBaseUrl() {
  return useSettingsStore.getState().serverUrl || getDefaultServerUrl();
}

export function getSessionHeaders(): Record<string, string> {
  const token = useSettingsStore.getState().sessionToken;
  const passphrase = useSettingsStore.getState().sessionPassphrase;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(passphrase ? { 'x-passphrase': passphrase } : {}),
  };
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getServerBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getSessionHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
