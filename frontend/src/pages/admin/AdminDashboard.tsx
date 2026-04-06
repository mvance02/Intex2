import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, HandHeart, Home, AlertTriangle, ShieldAlert } from 'lucide-react';
import KpiCard from '../../components/shared/KpiCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { SkeletonKpiCards } from '../../components/shared/SkeletonLoader';
import { apiFetch } from '../../utils/api';
import type {
  DashboardMetrics,
  RecentActivityItem,
  SafehouseSummaryItem,
} from '../../types/models';

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_DOT: Record<RecentActivityItem['type'], string> = {
  donation: 'bg-green-500',
  session: 'bg-blue-500',
  incident: 'bg-red-500',
};

const QUICK_ACTIONS: { label: string; to: string }[] = [
  { label: 'Add Resident', to: '/admin/residents' },
  { label: 'Log Session', to: '/admin/process-recordings' },
  { label: 'Log Visit', to: '/admin/visits' },
  { label: 'View Reports', to: '/admin/reports' },
];

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [safehouses, setSafehouses] = useState<SafehouseSummaryItem[]>([]);
  const [safehousesLoading, setSafehousesLoading] = useState(true);
  const [safehousesError, setSafehousesError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Dashboard — Hope Haven';
  }, []);

  const fetchMetrics = useCallback(() => {
    setMetricsLoading(true);
    setMetricsError(null);
    apiFetch<DashboardMetrics>('/api/dashboard/metrics')
      .then(setMetrics)
      .catch((err: unknown) =>
        setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics.')
      )
      .finally(() => setMetricsLoading(false));
  }, []);

  const fetchActivity = useCallback(() => {
    setActivityLoading(true);
    setActivityError(null);
    apiFetch<RecentActivityItem[]>('/api/dashboard/recent-activity')
      .then((items) =>
        setActivity(
          [...items].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        )
      )
      .catch((err: unknown) =>
        setActivityError(err instanceof Error ? err.message : 'Failed to load activity.')
      )
      .finally(() => setActivityLoading(false));
  }, []);

  const fetchSafehouses = useCallback(() => {
    setSafehousesLoading(true);
    setSafehousesError(null);
    apiFetch<SafehouseSummaryItem[]>('/api/dashboard/safehouse-summary')
      .then(setSafehouses)
      .catch((err: unknown) =>
        setSafehousesError(err instanceof Error ? err.message : 'Failed to load safehouses.')
      )
      .finally(() => setSafehousesLoading(false));
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { fetchActivity(); }, [fetchActivity]);
  useEffect(() => { fetchSafehouses(); }, [fetchSafehouses]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hope Haven Case Management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Key Metrics
        </h2>
        {metricsLoading && <SkeletonKpiCards count={6} />}
        {metricsError && (
          <ErrorAlert message={metricsError} onRetry={fetchMetrics} />
        )}
        {!metricsLoading && !metricsError && metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Active Residents"   value={metrics.activeResidents}             Icon={Users}        iconColor="text-teal-600" />
            <KpiCard label="YTD Donations"      value={formatPeso(metrics.ytdDonations)}    Icon={DollarSign}   iconColor="text-green-600" />
            <KpiCard label="Total Supporters"   value={metrics.totalSupporters}             Icon={HandHeart}    iconColor="text-blue-600" />
            <KpiCard label="Active Safehouses"  value={metrics.activeSafehouses}            Icon={Home}         iconColor="text-teal-600" />
            <KpiCard
              label="Open Incidents"
              value={metrics.openIncidents}
              Icon={AlertTriangle}
              iconColor="text-amber-600"
              colorClass={metrics.openIncidents > 0 ? 'bg-amber-50' : 'bg-white'}
            />
            <KpiCard label="High Risk Residents" value={metrics.highRiskResidents}          Icon={ShieldAlert}  iconColor="text-red-600" />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Activity
          </h2>
          {activityLoading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          )}
          {activityError && (
            <ErrorAlert message={activityError} onRetry={fetchActivity} />
          )}
          {!activityLoading && !activityError && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {activity.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
              )}
              {activity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-5 py-4">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${ACTIVITY_DOT[item.type]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {item.type} · {relativeDate(item.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Safehouse Summary */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Safehouse Summary
          </h2>
          {safehousesLoading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          )}
          {safehousesError && (
            <ErrorAlert message={safehousesError} onRetry={fetchSafehouses} />
          )}
          {!safehousesLoading && !safehousesError && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {safehouses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No safehouses found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Region</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Occupancy</th>
                      <th className="px-4 py-3 text-right font-medium">Residents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {safehouses.map((s) => (
                      <tr key={s.safehouseId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {s.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.region ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.status?.toLowerCase() === 'active'
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {s.status ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {s.currentOccupancy != null && s.capacityGirls != null
                            ? `${s.currentOccupancy} / ${s.capacityGirls}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {s.activeResidents}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
