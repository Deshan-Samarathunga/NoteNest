import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/storage/env';

export type AuthResult =
  | { ok: true; username: string }
  | { ok: false; response: NextResponse<{ error: string }> };

export function signSession(username: string) {
  return jwt.sign({ sub: username }, getRequiredEnv('SESSION_SECRET'), {
    algorithm: 'HS256',
    expiresIn: '2h'
  });
}

export function requireAuth(request: NextRequest): AuthResult {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  try {
    const decoded = jwt.verify(token, getRequiredEnv('SESSION_SECRET')) as jwt.JwtPayload;
    return { ok: true, username: String(decoded.sub ?? '') };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
}

export function getPassphrase(request: NextRequest) {
  return request.headers.get('x-passphrase') || undefined;
}

export function toErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === 'passphrase_required' ? 400 : message.includes('MEGA') || message.includes('mega') ? 503 : 500;
  return NextResponse.json({ error: status === 500 ? fallback : message }, { status });
}
