import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  buildExternalLoginUrl,
  getExternalProviders,
  loginUser,
  type ExternalAuthProvider,
} from '../../utils/authAPI';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, authSession, refreshAuthState } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberMe, setRememberMe]     = useState(true);
  const [showMfa, setShowMfa]           = useState(false);
  const [providers, setProviders]       = useState<ExternalAuthProvider[]>([]);
  const [serverError, setServerError]   = useState(searchParams.get('externalError') ?? '');
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    getExternalProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  // Redirect authenticated users to their dashboard based on role
  useEffect(() => {
    if (isAuthenticated) {
      if (authSession.roles.includes('Admin')) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/donor', { replace: true });
      }
    }
  }, [isAuthenticated, authSession.roles, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    setLoading(true);
    try {
      await loginUser(
        email, password, rememberMe,
        twoFactorCode || undefined,
        recoveryCode  || undefined,
      );
      await refreshAuthState();
      // Redirect is handled by the useEffect above
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Logo / brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 mb-4">
              <span className="text-2xl" aria-hidden="true">🏠</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Sign In</h1>
            <p className="text-sm text-gray-500 mt-1">Hope Haven portal</p>
          </div>

          {/* Server error */}
          {serverError && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="you@hopehaven.org"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••••"
              />
            </div>

            {/* MFA fields — hidden by default */}
            {showMfa ? (
              <>
                {/* MFA code */}
                <div className="mb-4">
                  <label htmlFor="two-factor-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Authenticator code <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="two-factor-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="6-digit code"
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave blank unless MFA is enabled on your account.</p>
                </div>

                {/* Recovery code */}
                <div className="mb-4">
                  <label htmlFor="recovery-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Recovery code <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Use when you cannot access the authenticator app"
                  />
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowMfa(true)}
                className="mb-4 text-sm text-teal-600 hover:text-teal-700 transition-colors"
              >
                Have an authenticator or recovery code?
              </button>
            )}

            {/* Remember me */}
            <div className="flex items-center mb-6">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">
                Keep me signed in across browser restarts
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <span
                  className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* External providers */}
          {providers.length > 0 && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-400">or</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {providers.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => window.location.assign(buildExternalLoginUrl(p.name, '/login'))}
                    className="w-full py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue with {p.displayName}
                  </button>
                ))}
                <p className="text-xs text-gray-400 text-center">
                  Google sign-in may not work on Safari. Use email &amp; password or try Chrome.
                </p>
              </div>
            </>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">
            Access restricted to authorised staff.{' '}
            <Link to="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>
          </p>
          <p className="text-sm text-gray-500 text-center mt-4">
            Need an account?{' '}
            <Link
              to="/register"
              className="inline-block ml-1 px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-full hover:bg-teal-700 transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
