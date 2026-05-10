export function getOptionalEnv(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export function encryptionEnabled() {
  return getOptionalEnv('ENABLE_ENCRYPTION') === 'true';
}
