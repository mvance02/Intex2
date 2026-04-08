import { Outlet, Link } from 'react-router-dom';
import hopeHavenLogo from '../../assets/HopeHavenLogo2.jpg';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <nav className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <Link to="/" className="inline-flex items-center bg-white h-10 w-44 overflow-hidden">
            <img
              src={hopeHavenLogo}
              alt="Hope Haven logo"
              className="h-full w-full object-cover scale-95"
            />
          </Link>
          <div className="flex items-center gap-6 text-xs sm:text-sm font-semibold uppercase tracking-[0.08em]">
            <Link to="/impact" className="hover:text-slate-600 transition-colors">Our Impact</Link>
            <Link to="/referral" className="hover:text-slate-600 transition-colors">Get Help</Link>
            <Link to="/login" className="border border-sky-300 bg-white text-slate-900 px-4 py-2 hover:bg-sky-300 hover:border-sky-300 transition-colors">
            Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-950 text-slate-400 text-sm px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Hope Haven. All rights reserved.</p>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
