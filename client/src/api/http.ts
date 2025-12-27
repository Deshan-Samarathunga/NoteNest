import { useSettingsStore } from '@/src/store/settingsStore';

export function getServerBaseUrl() {
  return useSettingsStore.getState().serverUrl || 'http://localhost:4000';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getServerBaseUrl();
  const token = useSettingsStore.getState().sessionToken;
  const passphrase = useSettingsStore.getState().sessionPassphrase;
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(passphrase ? { 'x-passphrase': passphrase } : {}),
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
