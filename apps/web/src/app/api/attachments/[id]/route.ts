import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, toErrorResponse } from '@/lib/auth/server';
import type { AuthResult } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  // Images
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  // Video
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogv')) return 'video/ogg';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  // Audio
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  // Documents
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.js')) return 'text/javascript';
  if (lower.endsWith('.css')) return 'text/css';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.gz') || lower.endsWith('.gzip')) return 'application/gzip';
  if (lower.endsWith('.tar')) return 'application/x-tar';
  if (lower.endsWith('.7z')) return 'application/x-7z-compressed';
  if (lower.endsWith('.rar')) return 'application/x-rar-compressed';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.exe')) return 'application/x-msdownload';
  if (lower.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (lower.endsWith('.apk')) return 'application/vnd.android.package-archive';
  return 'application/octet-stream';
}

function authenticateRequest(request: NextRequest): AuthResult {
  // First try normal Authorization header
  const headerAuth = requireAuth(request);
  if (headerAuth.ok) return headerAuth;

  // Fall back to ?token= query parameter (for <img>, <video>, <audio>, <embed> elements)
  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) {
    const fakeHeaders = new Headers(request.headers);
    fakeHeaders.set('authorization', `Bearer ${tokenParam}`);
    const fakeRequest = new NextRequest(request.url, { headers: fakeHeaders });
    return requireAuth(fakeRequest);
  }

  return headerAuth;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const params = await context.params;
    const result = await getNoteStorage(auth).downloadAttachment(params.id);
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
