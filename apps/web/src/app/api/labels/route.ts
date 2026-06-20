import { NextRequest, NextResponse } from 'next/server';
import { getPassphrase, requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const labels = await getNoteStorage(auth).getLabels(getPassphrase(request));
    return NextResponse.json({ labels, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'labels_list_failed');
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });

    const label = { id: crypto.randomUUID(), name, updatedAt: Date.now() };
    await getNoteStorage(auth).upsertLabel(label, getPassphrase(request));
    return NextResponse.json({ label, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'labels_create_failed');
  }
}
