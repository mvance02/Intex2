import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  HandHeart,
  Heart,
  Shield,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard',   path: '/donor',             Icon: LayoutDashboard },
  { label: 'My Donations', path: '/donor/donations',  Icon: HandHeart },
  { label: 'Donate',      path: '/donor/donate',      Icon: Heart },
  { label: 'Manage MFA',  path: '/donor/manage-mfa',  Icon: Shield },
];

export default function DonorLayout() {
  const { authSession, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const handleLogout = () => {
    void logout().then(() => navigate('/'));
  };

  const currentLabel =
    navItems.find((n) =>
      n.path === '/donor'
        ? location.pathname === '/donor'
        : location.pathname.startsWith(n.path)
    )?.label ?? 'Donor';

  const Sidebar = (
    <aside className="w-64 bg-teal-800 text-white flex flex-col h-full" aria-label="Donor navigation">
      <div className="px-6 py-5 border-b border-teal-700 flex items-center justify-between">
        <div>
          <Link to="/" className="text-xl font-bold tracking-tight hover:text-teal-200 transition-colors">Hope Haven</Link>
          <p className="text-teal-300 text-xs mt-0.5 font-medium">Donor Portal</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-teal-300 hover:text-white transition-colors p-1 rounded"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, path, Icon }) => {
          const active =
            path === '/donor'
              ? location.pathname === '/donor'
              : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-100 hover:bg-teal-700 hover:text-white'
              }`}
            >
              <Icon size={17} aria-hidden="true" className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-teal-700">
        <p className="text-sm font-medium text-white truncate">{authSession.email}</p>
        <p className="text-xs mt-0.5 text-teal-400">{authSession.roles[0] ?? 'Member'}</p>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-1.5 text-teal-400 hover:text-white transition-colors text-xs font-medium"
          aria-label="Sign out"
        >
          <LogOut size={13} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Desktop sidebar — fixed */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex flex-col w-64 shadow-xl">
            {Sidebar}
          </div>
        </div>
      )}

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3.5 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <h1 className="text-base font-semibold text-gray-800 flex-1">{currentLabel}</h1>
          <span className="text-sm text-gray-400 hidden sm:block truncate max-w-48">{authSession.email}</span>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
