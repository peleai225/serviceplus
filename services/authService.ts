import type { User } from '../types';

const TOKEN_KEY = 'serviplus_session_token';
const USER_KEY = 'serviplus_user';

/**
 * Effectue un appel fetch POST vers l'API avec gestion d'erreurs.
 */
async function apiPost<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Erreur réseau. Vérifiez votre connexion internet.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
        ? data.message
        : 'Une erreur est survenue. Veuillez réessayer.';
    throw new Error(message);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export async function register(params: {
  name: string;
  phone: string;
  city: string;
  role: 'CLIENT' | 'PROVIDER';
  password: string;
}): Promise<{ user: User; token: string }> {
  const data = await apiPost<{ user: User; token: string }>('/api/register', params as unknown as Record<string, unknown>);
  saveSession(data.token, data.user);
  return data;
}

export async function login(phone: string, password: string): Promise<{ user: User; token: string }> {
  const data = await apiPost<{ user: User; token: string }>('/api/login', { phone, password });
  saveSession(data.token, data.user);
  return data;
}

export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>('/api/otp', { action: 'send', phone });
}

export async function verifyOTP(phone: string, code: string): Promise<{ verified: boolean }> {
  return apiPost<{ verified: boolean }>('/api/otp', { action: 'verify', phone, code });
}

export async function checkSession(): Promise<{ valid: boolean; user?: User }> {
  const token = getToken();
  if (!token) {
    return { valid: false };
  }
  return apiPost<{ valid: boolean; user?: User }>('/api/me', { token });
}

export async function logout(): Promise<void> {
  try {
    await apiPost<void>('/api/logout');
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// ---------------------------------------------------------------------------
// Local storage helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token: string, user: any): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}
