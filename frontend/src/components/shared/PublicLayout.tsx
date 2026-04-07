import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">Hope Haven</Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link to="/impact"   className="hover:text-teal-200 transition-colors">Our Impact</Link>
          <Link to="/referral" className="hover:text-teal-200 transition-colors">Get Help</Link>
          <Link to="/login" className="bg-white text-teal-700 px-4 py-1.5 rounded-full hover:bg-teal-50 transition-colors">
            Login
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 text-sm px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Hope Haven. All rights reserved.</p>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
