import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, HeartPulse, GraduationCap, Utensils } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { portalSupporterTypeLabel } from '../../utils/supporterPortal';
import { primaryDonationLabel, recurringIntervalBadge } from '../../utils/donationDisplay';

const API = '';

function useCountUp(end: number, duration = 2000): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (end === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.floor(t * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return value;
}

function ImpactCard({ Icon, value, label }: { Icon: React.ComponentType<{ size?: number; className?: string }>; value: number; label: string }) {
  const animated = useCountUp(value);
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <Icon size={24} className="text-teal-600" />
      <span className="text-2xl font-bold text-gray-800">{animated.toLocaleString()}</span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/my-donations`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch {
      setError('Unable to load dashboard. Please try again.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { document.title = 'My Dashboard — Hope Haven'; }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner size="lg" label="Loading dashboard…" />;
  if (error) return <ErrorAlert message={error} />;

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

      {/* Your Impact */}
      {totalPhp > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-100 rounded-lg p-6 mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Your Impact</h3>
          <p className="text-sm text-gray-500 mb-4">Your generosity could fund approximately:</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ImpactCard Icon={Home} value={Math.floor(totalPhp / 504)} label="Days of Safe Housing" />
            <ImpactCard Icon={HeartPulse} value={Math.floor(totalPhp / 1176)} label="Counseling Sessions" />
            <ImpactCard Icon={GraduationCap} value={Math.floor(totalPhp / 3472)} label="Months of School" />
            <ImpactCard Icon={Utensils} value={Math.floor(totalPhp / 280)} label="Days of Meals" />
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">Based on average program costs</p>
        </div>
      )}

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
                    {primaryDonationLabel(d.campaignName, d.donationType, d.isRecurring)}
                    {d.isRecurring && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {recurringIntervalBadge(d.isRecurring, d.recurringFrequency, d.campaignName)}
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
