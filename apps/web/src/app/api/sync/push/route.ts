import { NextRequest, NextResponse } from 'next/server';
import { getPassphrase, requireAuth, toErrorResponse } from '@/lib/auth/server';
import { notesPushSchema } from '@/lib/schemas/note';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = notesPushSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    const result = await getNoteStorage(auth).syncPush(parsed.data.notes, getPassphrase(request));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'push_failed');
  }
}
