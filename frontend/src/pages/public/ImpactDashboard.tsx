import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { apiFetch, displaySafehouseName } from '../../utils/api';
import type { PublicImpactSnapshot, SafehouseSummaryItem } from '../../types/models';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';

interface DonationTrendPoint {
  year: number;
  month: number;
  totalAmount: number;
  donationCount: number;
}

interface DonationTrendsResponse {
  trends: DonationTrendPoint[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export default function ImpactDashboard() {
  const [trends, setTrends] = useState<DonationTrendPoint[]>([]);
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<DonationTrendsResponse>('/api/reports/donation-trends'),
      apiFetch<PublicImpactSnapshot[]>('/api/publicimpactsnapshots'),
      apiFetch<SafehouseSummaryItem[]>('/api/dashboard/safehouse-summary'),
    ])
      .then(([trendsRes, snapshotsRes, safehousesRes]) => {
        const now = new Date();
        setTrends(trendsRes.trends ?? []);
        setSnapshots(
          snapshotsRes.filter(
            (s) => !s.snapshotDate || new Date(s.snapshotDate) <= now,
          ),
        );
        setSafehouses(safehousesRes.map((s) => ({ ...s, name: displaySafehouseName(s.name) })));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = 'Our Impact — Hope Haven';
    load();
  }, []);

  const chartData = trends.map((t) => ({
    label: formatMonth(t.year, t.month),
    amount: t.totalAmount,
    donations: t.donationCount,
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Our Impact</h1>
      <p className="text-gray-500 mb-10">
        Transparent reporting on how your support is making a difference.
      </p>

      {loading && <LoadingSpinner label="Loading impact data…" />}
      {error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* Donation Trends Chart */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Donation Trends</h2>
            {chartData.length === 0 ? (
              <p className="text-gray-400 text-sm">No donation data available.</p>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `$${(v / 56 / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = Number(value);
                        const usd = Math.round(n / 56);
                        return [`$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'Total Donated'];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={false}
                      name="Total Donated"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Safehouse Occupancy */}
          {safehouses.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Safehouse Capacity</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={safehouses} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="capacityGirls" name="Capacity" fill="#ccfbf1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activeResidents" name="Active Residents" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Published impact snapshots */}
          {snapshots.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Impact Reports</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {snapshots.map((snap) => (
                  <article
                    key={snap.snapshotId}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
                  >
                    {snap.snapshotDate && (
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(snap.snapshotDate).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                    <h3 className="text-base font-semibold text-gray-800 mb-2">
                      {snap.headline?.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                    </h3>
                    {snap.summaryText && (
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {snap.summaryText.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
