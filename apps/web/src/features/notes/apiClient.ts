'use client';

import { AttachmentMeta, Label, NotePayload, SyncPullResponse, SyncPushResponse } from '@/lib/sync/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

export type Session = {
  token: string | null;
  passphrase: string;
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

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
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

export async function uploadAttachment(session: Session, file: File) {
  const form = new FormData();
  form.append('file', file, file.name);
  const response = await fetch(`${API_BASE}/attachments`, {
    method: 'POST',
    headers: sessionHeaders(session, false),
    body: form
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.status}`);
  }
  const result = (await response.json()) as { attachment: AttachmentMeta };
  return result.attachment;
}
