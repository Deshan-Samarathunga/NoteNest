import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file_missing' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    const id = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    await getNoteStorage(auth).uploadAttachment(id, buffer, file.type);

    const createdAt = Date.now();
    const baseUrl = process.env.PUBLIC_URL || new URL(request.url).origin;
    return NextResponse.json({
      attachment: {
        id,
        uri: `${baseUrl}/api/attachments/${id}`,
        mimeType: file.type || 'application/octet-stream',
        createdAt
      }
    });
  } catch (error) {
    return toErrorResponse(error, 'upload_failed');
  }
}
