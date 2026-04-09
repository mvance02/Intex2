import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { portalSupporterTypeLabel } from '../../utils/supporterPortal';

const API = import.meta.env.VITE_API_URL ?? '';

interface DonationRecord {
  donationId: number;
  amount: number | null;
  currencyCode: string | null;
  donationDate: string | null;
  isRecurring: boolean;
  recurringFrequency?: string | null;
  campaignName: string | null;
  donationType: string | null;
  impactUnit: string | null;
}

interface MyDonationsResponse {
  supporter: {
    supporterId: number;
    displayName: string;
    email: string;
    supporterType: string | null;
    createdAt: string | null;
  } | null;
  donations: DonationRecord[];
}

export default function DonorDashboard() {
  const { authSession } = useAuth();
  const [data, setData] = useState<MyDonationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/my-donations`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { document.title = 'My Dashboard — Hope Haven'; }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner size="lg" label="Loading dashboard…" />;

  const donations = data?.donations ?? [];
  const totalPhp = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const memberSince = data?.supporter?.createdAt
    ? new Date(data.supporter.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome back{authSession.email ? `, ${authSession.email}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">Thank you for supporting Hope Haven.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supporter type</p>
          <p className="text-lg font-bold text-teal-700 mt-1 leading-snug">
            {portalSupporterTypeLabel(data?.supporter?.supporterType)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Updated when you donate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Donated</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">
            {totalPhp > 0 ? `₱${totalPhp.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Donations Made</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">
            {donations.length > 0 ? donations.length : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{memberSince}</p>
        </div>
      </div>

      {/* Recent donations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Recent Donations</h3>
        {donations.length === 0 ? (
          <p className="text-sm text-gray-500">Your donation history will appear here.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {donations.slice(0, 5).map(d => (
              <div key={d.donationId} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {d.campaignName || d.donationType || 'Donation'}
                    {d.isRecurring && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {(d.recurringFrequency || 'Weekly').toLowerCase() === 'monthly'
                          ? 'Monthly'
                          : (d.recurringFrequency || 'Weekly').toLowerCase() === 'yearly'
                            ? 'Yearly'
                            : 'Weekly'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {d.donationDate ? new Date(d.donationDate + 'T00:00:00').toLocaleDateString() : '—'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-teal-700">
                  {d.currencyCode === 'USD' ? '$' : '₱'}
                  {(d.amount ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
            {donations.length > 5 && (
              <div className="pt-3">
                <Link to="/donor/donations" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                  View all {donations.length} donations →
                </Link>
              </div>
            )}
          </div>
        )}
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
