import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const quota = await getNoteStorage(auth).getStorageQuota();
    return NextResponse.json(quota);
  } catch (error) {
    return toErrorResponse(error, 'quota_check_failed');
  }
}
