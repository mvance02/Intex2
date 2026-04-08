import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';
import hopeHavenLogo from '../../assets/HopeHavenLogo2.jpg';


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
        className="hover:text-slate-600 transition-colors py-1 md:py-0"
      >
        Home
      </Link>
      <Link
        to="/impact"
        onClick={() => setMenuOpen(false)}
        className="hover:text-slate-600 transition-colors py-1 md:py-0"
      >
        Our Impact
      </Link>
      <Link
        to="/referral"
        onClick={() => setMenuOpen(false)}
        className="hover:text-slate-600 transition-colors py-1 md:py-0"
      >
        Get Help
      </Link>
      <Link
        to="/donor-wall"
        onClick={() => setMenuOpen(false)}
        className="hover:text-slate-600 transition-colors py-1 md:py-0"
      >
        Donor Wall
      </Link>
      {isAuthenticated && isAdmin && (
        <Link
          to="/admin"
          onClick={() => setMenuOpen(false)}
          className="hover:text-slate-600 transition-colors py-1 md:py-0"
        >
          Admin Portal
        </Link>
      )}
      {isAuthenticated && !isAdmin && (
        <Link
          to="/donor"
          onClick={() => setMenuOpen(false)}
          className="hover:text-slate-600 transition-colors py-1 md:py-0"
        >
          Donor Portal
        </Link>
      )}
      {isAuthenticated && (
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 hover:text-slate-600 transition-colors py-1 md:py-0"
        >
          <LogOut size={14} aria-hidden="true" />
          Sign Out
        </button>
      )}
      {!isAuthenticated && (
        <Link
          to="/login"
          onClick={() => setMenuOpen(false)}
          className="border border-sky-300 bg-white text-slate-900 px-4 py-2 hover:bg-sky-300 hover:border-sky-300 transition-colors text-center"
        >
          Login
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <nav className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center bg-white h-10 w-44 shrink-0 overflow-hidden">
            <img
              src={hopeHavenLogo}
              alt="Hope Haven logo"
              className="h-full w-full object-cover scale-95"
            />
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold uppercase tracking-[0.08em]">
            {navLinks}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors min-h-11 min-w-11"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 px-6 pb-4 pt-3">
            <div className="flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {navLinks}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-950 text-slate-400 text-sm px-6 py-6">
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
