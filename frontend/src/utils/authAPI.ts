import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwofactorStatus';

export interface ExternalAuthProvider { name: string; displayName: string; }

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY  = 'hh_access_token';

// ---------------------------------------------------------------------------
// Token storage (localStorage for persistent, sessionStorage for session-only)
// Works across all browsers including iOS Safari (no cross-origin cookie issue)
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string, persistent: boolean): void {
  try {
    if (persistent) localStorage.setItem(TOKEN_KEY, token);
    else            sessionStorage.setItem(TOKEN_KEY, token);
  } catch { /* private browsing — no-op */ }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Error parsing
// ---------------------------------------------------------------------------

async function readApiError(res: Response, fallback: string): Promise<string> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json')) return fallback; // covers application/json and application/problem+json
  const d = await res.json();
  if (typeof d?.detail === 'string' && d.detail.length > 0) return d.detail;
  if (typeof d?.title  === 'string' && d.title.length  > 0) return d.title;
  if (d?.errors) {
    const first = Object.values(d.errors).flat()
      .find((v): v is string => typeof v === 'string');
    if (first) return first;
  }
  if (typeof d?.message === 'string' && d.message.length > 0) return d.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// 2FA helper (authenticated)
// ---------------------------------------------------------------------------

async function post2FA(payload: object): Promise<TwoFactorStatus> {
  const res = await fetch(`${apiBaseUrl}/api/auth/manage/2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Unable to update MFA settings.'));
  return res.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildExternalLoginUrl(provider: string, returnPath = '/'): string {
  return `${apiBaseUrl}/api/auth/external-login?${new URLSearchParams({ provider, returnPath })}`;
}

export async function getExternalProviders(): Promise<ExternalAuthProvider[]> {
  const r = await fetch(`${apiBaseUrl}/api/auth/providers`, { credentials: 'include' });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to load external providers.'));
  return r.json();
}

export async function getAuthSession(): Promise<AuthSession> {
  const r = await fetch(`${apiBaseUrl}/api/auth/me`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error('Unable to load auth session.');
  return r.json();
}

export async function assignDefaultRole(email: string): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/account/assign-default-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to assign role.'));
}

export async function registerUser(email: string, password: string): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to register.'));
}

/**
 * Login using the Identity API token endpoint (no useCookies param).
 * Returns a Bearer access token stored in localStorage/sessionStorage.
 * This approach works on all browsers including iOS Safari which blocks
 * cross-origin cookies.
 */
export async function loginUser(
  email: string, password: string, rememberMe: boolean,
  twoFactorCode?: string, twoFactorRecoveryCode?: string
): Promise<void> {
  const body: Record<string, string> = { email, password };
  if (twoFactorCode)         body.twoFactorCode         = twoFactorCode;
  if (twoFactorRecoveryCode) body.twoFactorRecoveryCode = twoFactorRecoveryCode;

  const r = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiError(r,
    'Unable to log in. If MFA is enabled, include an authenticator or recovery code.'));

  const data = await r.json().catch(() => null) as { accessToken?: string } | null;
  if (data?.accessToken) storeToken(data.accessToken, rememberMe);
}

export async function logoutUser(): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  });
  clearToken();
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to log out.'));
}

export const getTwoFactorStatus = ()                       => post2FA({});
export const enableTwoFactor    = (twoFactorCode: string) =>
  post2FA({ enable: true, twoFactorCode, resetRecoveryCodes: true });
export const disableTwoFactor   = ()                       => post2FA({ enable: false });
export const resetRecoveryCodes = ()                       => post2FA({ resetRecoveryCodes: true });
