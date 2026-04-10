import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwofactorStatus';

export interface ExternalAuthProvider { name: string; displayName: string; }

// Auth calls go through the same-origin Vercel proxy (/api/*)
// so cookies are first-party and work on mobile browsers.
const apiBaseUrl = '';

// Google OAuth MUST go directly to Railway because the correlation
// cookie and callback URL live on the Railway domain.
const oauthBaseUrl = '';

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

async function post2FA(payload: object): Promise<TwoFactorStatus> {
  const res = await fetch(`${apiBaseUrl}/api/auth/manage/2fa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Unable to update MFA settings.'));
  return res.json();
}

export function buildExternalLoginUrl(provider: string, returnPath = '/'): string {
  return `${oauthBaseUrl}/api/auth/external-login?${new URLSearchParams({ provider, returnPath })}`;
}
export async function getExternalProviders(): Promise<ExternalAuthProvider[]> {
  const r = await fetch(`${apiBaseUrl}/api/auth/providers`, { credentials: 'include' });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to load external providers.'));
  return r.json();
}
export async function getAuthSession(): Promise<AuthSession> {
  const r = await fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' });
  if (!r.ok) throw new Error('Unable to load auth session.');
  return r.json();
}
export async function assignDefaultRole(email: string): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/account/assign-default-role`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to assign role.'));
}
export async function registerUser(email: string, password: string): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to register.'));
}
export async function loginUser(
  email: string, password: string, rememberMe: boolean,
  twoFactorCode?: string, twoFactorRecoveryCode?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (rememberMe) params.set('useCookies', 'true');
  else params.set('useSessionCookies', 'true');
  const body: Record<string, string> = { email, password };
  if (twoFactorCode)         body.twoFactorCode         = twoFactorCode;
  if (twoFactorRecoveryCode) body.twoFactorRecoveryCode = twoFactorRecoveryCode;
  const r = await fetch(`${apiBaseUrl}/api/auth/login?${params}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(body),
  });
  if (!r.ok) {
    // ASP.NET Core Identity returns ProblemDetails with `detail` set to a
    // SignInResult code: "Failed", "RequiresTwoFactor", "LockedOut", or "NotAllowed".
    // Translate each to a human-readable message.
    let detail: string | undefined;
    try {
      const body = await r.clone().json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch { /* non-JSON body — fall through */ }

    if (detail === 'RequiresTwoFactor') {
      throw new Error('Two-factor authentication is required. Enter your authenticator or recovery code.');
    }
    if (detail === 'LockedOut') {
      throw new Error('This account is temporarily locked due to too many failed attempts. Please try again later.');
    }
    if (detail === 'NotAllowed') {
      throw new Error('Sign-in is not allowed for this account. Please contact an administrator.');
    }
    if (r.status === 401 || detail === 'Failed') {
      throw new Error('Incorrect email or password.');
    }
    throw new Error(await readApiError(r, 'Unable to sign in. Please try again.'));
  }
}
export async function logoutUser(): Promise<void> {
  const r = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: 'POST', credentials: 'include',
  });
  if (!r.ok) throw new Error(await readApiError(r, 'Unable to log out.'));
}
export const getTwoFactorStatus = ()                       => post2FA({});
export const enableTwoFactor    = (twoFactorCode: string) =>
  post2FA({ enable: true, twoFactorCode, resetRecoveryCodes: true });
export const disableTwoFactor   = ()                       => post2FA({ enable: false });
export const resetRecoveryCodes = ()                       => post2FA({ resetRecoveryCodes: true });
