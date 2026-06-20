import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file_missing' }, { status: 400 });
    }

    const storage = getNoteStorage(auth);

    // Check Mega.nz quota before uploading.
    try {
      const quota = await storage.getStorageQuota();
      if (file.size > quota.spaceFree) {
        return NextResponse.json(
          {
            error: `Not enough MEGA storage. You have ${formatBytes(quota.spaceFree)} free but this file is ${formatBytes(file.size)}.`
          },
          { status: 413 }
        );
      }
    } catch {
      // If quota check fails, still attempt the upload — MEGA will reject if full.
    }

    const id = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || undefined;
    await storage.uploadAttachment(id, buffer, file.type, originalName);

    const createdAt = Date.now();
    const baseUrl = process.env.PUBLIC_URL || new URL(request.url).origin;
    return NextResponse.json({
      attachment: {
        id,
        uri: `${baseUrl}/api/attachments/${id}`,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name || undefined,
        fileSize: file.size || undefined,
        createdAt
      }
    });
  } catch (error) {
    return toErrorResponse(error, 'upload_failed');
  }
}
