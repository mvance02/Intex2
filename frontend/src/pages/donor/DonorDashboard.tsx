import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function DonorDashboard() {
  const { authSession } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome back{authSession.email ? `, ${authSession.email}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">Thank you for supporting Hope Haven.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Donated</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Donations Made</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">—</p>
        </div>
      </div>

      {/* Recent donations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Recent Donations</h3>
        <p className="text-sm text-gray-500">Your donation history will appear here.</p>
      </div>

      {/* CTA */}
      <Link
        to="/donor/donate"
        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Heart size={16} aria-hidden="true" />
        Make a Donation
      </Link>
    </div>
  );
}
