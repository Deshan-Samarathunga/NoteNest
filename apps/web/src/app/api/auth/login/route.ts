import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession } from '@/lib/auth/server';
import { getRequiredEnv } from '@/lib/storage/env';

export const runtime = 'nodejs';

const credsSchema = z.object({
  username: z.string(),
  password: z.string()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = credsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
  }

  const { username, password } = parsed.data;
  if (username !== getRequiredEnv('AUTH_USERNAME') || password !== getRequiredEnv('AUTH_PASSWORD')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    token: signSession(username),
    expiresIn: 7200
  });
}
