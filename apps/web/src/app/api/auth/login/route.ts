import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession, SESSION_TTL_SECONDS } from '@/lib/auth/server';
import { getMegaStorage } from '@/lib/mega/client';

export const runtime = 'nodejs';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = credsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // The MEGA account itself is the credential store: a successful login proves
  // the email/password are valid and warms the connection cache.
  try {
    await getMegaStorage(email, password);
  } catch {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  return NextResponse.json({
    token: signSession({ email, password }),
    expiresIn: SESSION_TTL_SECONDS
  });
}
