import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import {
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  resetRecoveryCodes,
} from '../../utils/authAPI';
import type { TwoFactorStatus } from '../../types/TwofactorStatus';

export default function ManageMFAPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const [status,  setStatus]  = useState<TwoFactorStatus | null>(null);
  const [code,    setCode]    = useState('');
  const [qr,      setQr]      = useState('');
  const [codes,   setCodes]   = useState<string[]>([]);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [busy,    setBusy]    = useState(false);

  const uri = useMemo(() => {
    if (!authSession.email || !status?.sharedKey) return '';
    const issuer = 'Hope Haven';
    const label  = `${issuer}:${authSession.email}`;
    const params = new URLSearchParams({ secret: status.sharedKey, issuer });
    return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
  }, [authSession.email, status?.sharedKey]);

  useEffect(() => { document.title = 'Manage MFA — Hope Haven'; }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated)
      getTwoFactorStatus()
        .then((s) => { setStatus(s); setCodes(s.recoveryCodes ?? []); })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load MFA status.'));
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!uri) { setQr(''); return; }
    QRCode.toDataURL(uri, { width: 224, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [uri]);

  async function handleEnable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await enableTwoFactor(code);
      setStatus(s); setCodes(s.recoveryCodes ?? []); setCode('');
      setSuccess('MFA enabled. Save the recovery codes below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to enable MFA.');
    } finally { setBusy(false); }
  }

  async function handleDisable() {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await disableTwoFactor(); setStatus(s); setCodes([]);
      setSuccess('MFA disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable MFA.');
    } finally { setBusy(false); }
  }

  async function handleReset() {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const s = await resetRecoveryCodes();
      setStatus(s); setCodes(s.recoveryCodes ?? []);
      setSuccess('Recovery codes reset.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset codes.');
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Authenticator App (MFA)</h1>

      {isLoading && <p className="text-sm text-gray-500">Checking session…</p>}

      {!isLoading && !isAuthenticated && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Please <Link to="/login" className="underline font-medium">sign in</Link> to manage MFA settings.
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {isAuthenticated && status && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Status badge */}
          <div className="mb-5">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              status.isTwoFactorEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status.isTwoFactorEnabled ? 'MFA enabled' : 'MFA not enabled'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR code + shared key */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col items-center">
              {qr && <img src={qr} alt="MFA QR code" className="mb-3 rounded-lg" />}
              <p className="text-xs font-semibold text-gray-600 mb-1">Shared key</p>
              <code className="text-xs text-gray-700 break-all text-center">
                {status.sharedKey ?? 'Unavailable'}
              </code>
            </div>

            {/* Enable / disable controls */}
            <div className="flex flex-col justify-center">
              {!status.isTwoFactorEnabled ? (
                <form onSubmit={handleEnable} className="space-y-4">
                  <div>
                    <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-1">
                      Authenticator code
                    </label>
                    <input
                      id="mfa-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="6-digit code from app"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                  >
                    {busy ? 'Enabling…' : 'Enable MFA'}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleReset}
                    disabled={busy}
                    className="py-2.5 px-4 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    Reset recovery codes
                  </button>
                  <button
                    onClick={handleDisable}
                    disabled={busy}
                    className="py-2.5 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    Disable MFA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recovery codes */}
          {codes.length > 0 && (
            <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">
                Recovery codes — save these now, they will not be shown again
              </h2>
              <ul className="grid grid-cols-2 gap-1">
                {codes.map((c) => (
                  <li key={c}>
                    <code className="text-xs text-amber-900">{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {codes.length === 0 && (
            <p className="mt-5 text-sm text-gray-400">
              Recovery codes remaining: {status.recoveryCodesLeft}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
