import { apiFetch } from './http';
import { NotePayload, SyncPullResponse, SyncPushResponse } from './types';

export async function pullNotes(since: number): Promise<SyncPullResponse> {
  return apiFetch<SyncPullResponse>(`/sync/pull?since=${since}`, {
    method: 'GET',
  });
}

export async function pushNotes(notes: NotePayload[]): Promise<SyncPushResponse> {
  return apiFetch<SyncPushResponse>('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}
