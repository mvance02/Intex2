import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const API = import.meta.env.VITE_API_URL ?? '';

interface DonationRecord {
  donationId: number;
  amount: number | null;
  currencyCode: string | null;
  donationDate: string | null;
  isRecurring: boolean;
  campaignName: string | null;
  donationType: string | null;
  impactUnit: string | null;
}

export default function DonorDonations() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/my-donations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { donations?: DonationRecord[] };
        setDonations(data.donations ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner size="lg" label="Loading donations…" />;

  const totalPhp = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Donations</h2>
          {donations.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {donations.length} donation{donations.length !== 1 ? 's' : ''} · Total: ₱{totalPhp.toLocaleString()}
            </p>
          )}
        </div>
        <Link
          to="/donor/donate"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors min-h-11"
        >
          <Heart size={14} aria-hidden="true" />
          Donate
        </Link>
      </div>

      {donations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 shadow-sm text-center">
          <p className="text-gray-500 text-sm mb-4">
            Your donation history will appear here once you make your first donation.
          </p>
          <Link
            to="/donor/donate"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Heart size={16} aria-hidden="true" />
            Make a Donation
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donations.map(d => (
                <tr key={d.donationId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">
                    {d.donationDate ? new Date(d.donationDate + 'T00:00:00').toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {d.campaignName || d.donationType || 'Donation'}
                    {d.isRecurring && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Weekly
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{d.donationType || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-700">
                    {d.currencyCode === 'USD' ? '$' : '₱'}
                    {(d.amount ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
