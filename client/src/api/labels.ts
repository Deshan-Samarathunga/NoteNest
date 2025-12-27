import { apiFetch } from './http';
import { Label } from './types';

export async function fetchLabels(): Promise<Label[]> {
  const res = await apiFetch<{ labels: Label[]; serverTime: number }>('/labels', { method: 'GET' });
  return res.labels;
}

export async function createLabel(name: string): Promise<Label> {
  const res = await apiFetch<{ label: Label }>('/labels', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.label;
}

export async function updateLabel(id: string, name: string): Promise<Label> {
  const res = await apiFetch<{ label: Label }>(`/labels/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return res.label;
}

export async function deleteLabel(id: string): Promise<void> {
  await apiFetch(`/labels/${id}`, { method: 'DELETE' });
}
