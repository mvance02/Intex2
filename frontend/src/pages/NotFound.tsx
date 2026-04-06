import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 — Hope Haven';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-teal-200 leading-none select-none" aria-hidden="true">
          404
        </p>
        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ← Go back
          </button>
          <Link
            to={isAuthenticated ? '/admin' : '/'}
            className="px-5 py-2.5 text-sm bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
