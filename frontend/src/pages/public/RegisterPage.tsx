import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  buildExternalLoginUrl,
  getExternalProviders,
  registerUser,
  type ExternalAuthProvider,
} from '../../utils/authAPI';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage]       = useState('');
  const [successMessage, setSuccessMessage]   = useState('');
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [providers, setProviders]             = useState<ExternalAuthProvider[]>([]);

  useEffect(() => {
    getExternalProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  useEffect(() => { document.title = 'Register — Hope Haven'; }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Passwords must match.');
      return;
    }
    if (password.length < 14) {
      setErrorMessage('Password must be at least 14 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerUser(email, password);
      setSuccessMessage('Registration succeeded. Redirecting to login…');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 mb-4">
              <span className="text-2xl" aria-hidden="true">🏠</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Create account</h1>
            <p className="text-sm text-gray-500 mt-1">Hope Haven portal</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="you@hopehaven.org"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="14+ characters"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 14 characters — no complexity requirements.</p>
            </div>

            <div className="mb-6">
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••••"
              />
            </div>

            {errorMessage && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-sky-300 text-slate-900 text-sm font-semibold rounded-lg hover:bg-sky-200 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <span
                  className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              )}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

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
                    className="w-full py-2.5 px-4 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
            Already have an account?{' '}
            <Link to="/login" className="underline hover:text-gray-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
