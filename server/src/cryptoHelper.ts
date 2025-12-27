import crypto from 'crypto';

const ITERATIONS = 120_000;
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;

export type EncryptedPayload = {
  iv: string;
  salt: string;
  ciphertext: string;
  tag: string;
};

function deriveKey(passphrase: string, salt: Buffer) {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
}

export function encryptJson(payload: unknown, passphrase: string): EncryptedPayload {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf-8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptJson<T>(payload: EncryptedPayload, passphrase: string): T {
  const salt = Buffer.from(payload.salt, 'base64');
  const key = deriveKey(passphrase, salt);
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8')) as T;
}

export function maybeEncrypt(payload: unknown, passphrase?: string) {
  if (!process.env.ENABLE_ENCRYPTION || process.env.ENABLE_ENCRYPTION !== 'true') {
    return payload;
  }
  if (!passphrase) throw new Error('passphrase_required');
  return encryptJson(payload, passphrase);
}

export function maybeDecrypt<T>(payload: any, passphrase?: string): T {
  if (!process.env.ENABLE_ENCRYPTION || process.env.ENABLE_ENCRYPTION !== 'true') {
    return payload as T;
  }
  if (!passphrase) throw new Error('passphrase_required');
  return decryptJson<T>(payload as EncryptedPayload, passphrase);
}
