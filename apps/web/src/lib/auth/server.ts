import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/storage/env';

export type MegaCredentials = { email: string; password: string };

export type AuthResult =
  | ({ ok: true } & MegaCredentials)
  | { ok: false; response: NextResponse<{ error: string }> };

const SESSION_TTL = '30d';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function credsKey() {
  // Derive a stable 32-byte AES key from the session secret.
  return createHash('sha256').update(getRequiredEnv('SESSION_SECRET')).digest();
}

export function encryptCreds(creds: MegaCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credsKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(creds), 'utf-8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64')).join('.');
}

export function decryptCreds(blob: string): MegaCredentials {
  const [ivB64, tagB64, dataB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid_token');
  const decipher = createDecipheriv('aes-256-gcm', credsKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  const parsed = JSON.parse(plaintext.toString('utf-8'));
  if (!parsed || typeof parsed.email !== 'string' || typeof parsed.password !== 'string') {
    throw new Error('invalid_token');
  }
  return { email: parsed.email, password: parsed.password };
}

export function signSession(creds: MegaCredentials) {
  return jwt.sign({ sub: creds.email, c: encryptCreds(creds) }, getRequiredEnv('SESSION_SECRET'), {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL
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
    const creds = decryptCreds(String(decoded.c ?? ''));
    return { ok: true, ...creds };
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
