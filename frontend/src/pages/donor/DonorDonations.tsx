import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function DonorDonations() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Donations</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-10 shadow-sm text-center mb-6">
        <p className="text-gray-500 text-sm">
          Your donation history will appear here once you make your first donation.
        </p>
      </div>

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
