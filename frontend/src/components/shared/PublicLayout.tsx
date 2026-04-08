import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';

export default function PublicLayout() {
  const { isAuthenticated, authSession, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = authSession.roles.includes('Admin');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    void logout().then(() => navigate('/'));
  };

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        className="hover:text-teal-200 transition-colors py-1 md:py-0"
      >
        Home
      </Link>
      <Link
        to="/impact"
        onClick={() => setMenuOpen(false)}
        className="hover:text-teal-200 transition-colors py-1 md:py-0"
      >
        Our Impact
      </Link>
      <Link
        to="/referral"
        onClick={() => setMenuOpen(false)}
        className="hover:text-teal-200 transition-colors py-1 md:py-0"
      >
        Get Help
      </Link>
      {isAuthenticated && isAdmin && (
        <Link
          to="/admin"
          onClick={() => setMenuOpen(false)}
          className="hover:text-teal-200 transition-colors py-1 md:py-0"
        >
          Admin Portal
        </Link>
      )}
      {isAuthenticated && !isAdmin && (
        <Link
          to="/donor"
          onClick={() => setMenuOpen(false)}
          className="hover:text-teal-200 transition-colors py-1 md:py-0"
        >
          Donor Portal
        </Link>
      )}
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 hover:text-teal-200 transition-colors py-1 md:py-0"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      )}
      {!isAuthenticated && (
        <Link
          to="/login"
          onClick={() => setMenuOpen(false)}
          className="bg-white text-teal-700 px-4 py-2.5 rounded-full hover:bg-teal-50 transition-colors text-center"
        >
          Login
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="bg-teal-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Hope Haven
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex gap-6 text-sm font-medium items-center">
            {navLinks}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 rounded-lg hover:bg-teal-600 transition-colors min-h-11 min-w-11"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden flex flex-col gap-4 pt-4 pb-2 text-sm font-medium border-t border-teal-600 mt-4">
            {navLinks}
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 text-sm px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} Hope Haven. All rights reserved.</p>
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
