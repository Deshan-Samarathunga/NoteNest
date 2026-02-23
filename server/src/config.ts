function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set in the environment`);
  }
  return value;
}

export const JWT_SECRET = requiredEnv('SESSION_SECRET');
export const AUTH_USERNAME = requiredEnv('AUTH_USERNAME');
export const AUTH_PASSWORD = requiredEnv('AUTH_PASSWORD');
