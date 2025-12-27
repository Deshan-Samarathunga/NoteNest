import { apiFetch } from './http';

export type AuthResponse = { token: string; expiresIn: number };

export async function login(username: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
