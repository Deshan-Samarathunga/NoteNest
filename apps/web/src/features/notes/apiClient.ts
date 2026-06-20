'use client';

import { AttachmentMeta, Label, NotePayload, SyncPullResponse, SyncPushResponse } from '@/lib/sync/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

export type Session = {
  token: string | null;
  passphrase: string;
};

export type UploadProgress = {
  percent: number;
  loaded: number;
  total: number;
  speedBps: number;
};

export type StorageQuota = {
  spaceUsed: number;
  spaceTotal: number;
  spaceFree: number;
};

function sessionHeaders(session: Session, json = true): HeadersInit {
  return {
    ...(json ? { 'content-type': 'application/json' } : {}),
    ...(session.token ? { authorization: `Bearer ${session.token}` } : {}),
    ...(session.passphrase ? { 'x-passphrase': session.passphrase } : {})
  };
}

async function apiJson<T>(path: string, session: Session, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...sessionHeaders(session),
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json() as Promise<{ token: string; expiresIn: number }>;
}

export function pullNotes(session: Session, since: number) {
  return apiJson<SyncPullResponse>(`/sync/pull?since=${since}`, session);
}

export function pushNotes(session: Session, notes: NotePayload[]) {
  return apiJson<SyncPushResponse>('/sync/push', session, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
}

export async function createLabel(session: Session, name: string) {
  const result = await apiJson<{ label: Label; serverTime: number }>('/labels', session, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
  return result.label;
}

export async function updateLabel(session: Session, id: string, name: string) {
  const result = await apiJson<{ label: Label; serverTime: number }>(`/labels/${id}`, session, {
    method: 'PUT',
    body: JSON.stringify({ name })
  });
  return result.label;
}

export function deleteLabel(session: Session, id: string) {
  return apiJson<{ ok: boolean; serverTime: number }>(`/labels/${id}`, session, {
    method: 'DELETE'
  });
}

export function getStorageQuota(session: Session) {
  return apiJson<StorageQuota>('/storage/quota', session);
}

export function uploadAttachment(
  session: Session,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<AttachmentMeta> {
  return new Promise<AttachmentMeta>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file, file.name);

    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const speedBps = elapsed > 0 ? (event.loaded - lastLoaded) / elapsed : 0;
      lastLoaded = event.loaded;
      lastTime = now;
      onProgress({
        percent: Math.round((event.loaded / event.total) * 100),
        loaded: event.loaded,
        total: event.total,
        speedBps
      });
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText) as { attachment: AttachmentMeta };
          resolve(result.attachment);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body?.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(xhr.responseText || `Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed: network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${API_BASE}/attachments`);
    if (session.token) xhr.setRequestHeader('authorization', `Bearer ${session.token}`);
    if (session.passphrase) xhr.setRequestHeader('x-passphrase', session.passphrase);
    xhr.send(form);
  });
}
