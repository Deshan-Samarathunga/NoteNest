import { NextRequest, NextResponse } from 'next/server';
import { getPassphrase, requireAuth, toErrorResponse } from '@/lib/auth/server';
import { notePayloadSchema } from '@/lib/schemas/note';
import { noteStorage } from '@/lib/storage/noteStorage';
import { NotePayload } from '@/lib/sync/types';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const note = await noteStorage.readActiveNote(await getId(context), getPassphrase(request));
    if (!note) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ note, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'note_get_failed');
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const id = await getId(context);
    const body = await request.json().catch(() => null);
    const parsed = notePayloadSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    await noteStorage.syncPush([parsed.data as NotePayload], getPassphrase(request));
    return NextResponse.json({ ok: true, serverTime: Date.now() });
  } catch (error) {
    return toErrorResponse(error, 'note_put_failed');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const now = Date.now();
    const note: NotePayload = { id: await getId(context), trashed: true, deleted: true, updatedAt: now };
    await noteStorage.syncPush([note], getPassphrase(request));
    return NextResponse.json({ ok: true, serverTime: now });
  } catch (error) {
    return toErrorResponse(error, 'note_delete_failed');
  }
}
