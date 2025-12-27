import { v4 as uuidv4 } from 'uuid';

import { Label } from '@/src/api/types';
import { databaseAdapter } from './database';

export async function getLabels(): Promise<Label[]> {
  return databaseAdapter.getLabels();
}

export async function replaceLabels(labels: Label[]) {
  await databaseAdapter.replaceLabels(labels);
}

export async function upsertLabel(label: Label) {
  const labels = await getLabels();
  const existing = labels.find((l) => l.id === label.id);
  const next = existing ? labels.map((l) => (l.id === label.id ? label : l)) : [...labels, label];
  await replaceLabels(next);
}

export async function createLocalLabel(name: string): Promise<Label> {
  const label: Label = { id: uuidv4(), name, updatedAt: Date.now() };
  await upsertLabel(label);
  return label;
}
