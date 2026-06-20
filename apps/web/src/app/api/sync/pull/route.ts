import { NextRequest, NextResponse } from 'next/server';
import { getPassphrase, requireAuth, toErrorResponse } from '@/lib/auth/server';
import { getNoteStorage } from '@/lib/storage/noteStorage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const storage = getNoteStorage(auth);
    const since = Number(request.nextUrl.searchParams.get('since') ?? 0);
    const passphrase = getPassphrase(request);
    const result = await storage.syncPull(Number.isNaN(since) ? 0 : since, passphrase);
    const labels = await storage.getLabels(passphrase);
    return NextResponse.json({ ...result, labels });
  } catch (error) {
    return toErrorResponse(error, 'pull_failed');
  }
}
