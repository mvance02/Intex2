import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, HandHeart, Home, AlertTriangle, ShieldAlert } from 'lucide-react';
import KpiCard from '../../components/shared/KpiCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import { SkeletonKpiCards } from '../../components/shared/SkeletonLoader';
import { apiFetch, displaySafehouseName } from '../../utils/api';
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

function CapacityGauge({ name, region, status, occupancy, capacity }: {
  name: string; region: string; status: string; occupancy: number; capacity: number;
}) {
  const pct = capacity > 0 ? (occupancy / capacity) * 100 : 0;
  const color = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#0d9488';
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 p-5 flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="butt" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{occupancy}/{capacity}</span>
          <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 text-sm">{name}</p>
        <p className="text-xs text-gray-400">{region}</p>
      </div>
      <span className={`text-xs font-semibold uppercase tracking-[0.06em] px-2 py-0.5 ${
        status?.toLowerCase() === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
      }`}>{status}</span>
    </div>
  );
}

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
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
            <KpiCard label="Active Residents"   value={metrics.activeResidents}             Icon={Users}        iconColor="text-blue-600" />
            <KpiCard label="YTD Donations"      value={formatPeso(metrics.ytdDonations)}    Icon={DollarSign}   iconColor="text-green-600" />
            <KpiCard label="Total Supporters"   value={metrics.totalSupporters}             Icon={HandHeart}    iconColor="text-blue-600" />
            <KpiCard label="Active Safehouses"  value={metrics.activeSafehouses}            Icon={Home}         iconColor="text-blue-600" />
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

      {/* Recent Activity — full-width on its own row */}
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
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {activity.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
            )}
            {activity.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 px-5 py-4">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 ${ACTIVITY_DOT[item.type]}`}
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

      {/* Safehouse Capacity — full-width gauge grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Safehouse Capacity
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
          safehouses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No safehouses found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {safehouses.map((s) => (
                <CapacityGauge
                  key={s.safehouseId}
                  name={displaySafehouseName(s.name)}
                  region={s.region ?? '—'}
                  status={s.status ?? '—'}
                  occupancy={s.currentOccupancy ?? 0}
                  capacity={s.capacityGirls ?? 0}
                />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
