import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logoutUser } from '../../utils/authAPI';
import { useAuth } from '../../contexts/AuthContext';

export default function LogoutPage() {
  const [message, setMessage] = useState('Signing you out…');
  const [error,   setError]   = useState('');
  const { refreshAuthState } = useAuth();

  useEffect(() => {
    let live = true;
    logoutUser()
      .then(() => refreshAuthState())
      .then(() => { if (live) setMessage('You are now signed out.'); })
      .catch((e: unknown) => {
        if (live) {
          setError(e instanceof Error ? e.message : 'Logout did not complete.');
          setMessage('Logout did not complete.');
        }
      });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 mb-4">
            <span className="text-2xl" aria-hidden="true">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Logout</h1>
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <Link
              to="/"
              className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Log in again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
