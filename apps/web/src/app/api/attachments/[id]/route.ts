import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, toErrorResponse } from '@/lib/auth/server';
import { noteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function mimeFromName(name: string) {
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.heic')) return 'image/heic';
  return 'application/octet-stream';
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const params = await context.params;
    const result = await noteStorage.downloadAttachment(params.id);
    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return new NextResponse(result.buffer, {
      headers: {
        'content-type': mimeFromName(result.name),
        'cache-control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    return toErrorResponse(error, 'download_failed');
  }
}
