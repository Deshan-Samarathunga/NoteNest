import { NextRequest, NextResponse } from 'next/server';
import { getPassphrase, requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });

    const label = { id: await getId(context), name, updatedAt: Date.now() };
    await getNoteStorage(auth).upsertLabel(label, getPassphrase(request));
    return NextResponse.json({ label, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'labels_update_failed');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    await getNoteStorage(auth).deleteLabel(await getId(context), getPassphrase(request));
    return NextResponse.json({ ok: true, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'labels_delete_failed');
  }
}
