import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, HandHeart, Home, AlertTriangle, ShieldAlert } from 'lucide-react';
import KpiCard from '../../components/shared/KpiCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import Modal from '../../components/shared/Modal';
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
  session: 'bg-sky-300',
  incident: 'bg-red-500',
};

const CASE_CATEGORIES = ['Surrendered', 'Abandoned', 'Foundling', 'Neglected'] as const;
const CASE_STATUSES = ['Active', 'Closed', 'Transferred'] as const;

const QUICK_ACTIONS: { label: string; to: string }[] = [
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
        status?.toLowerCase() === 'active' ? 'bg-sky-50 text-slate-700' : 'bg-gray-100 text-gray-500'
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

  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 10;

  const [showAddResident, setShowAddResident] = useState(false);
  const [addResidentSubmitting, setAddResidentSubmitting] = useState(false);
  const [addResidentError, setAddResidentError] = useState<string | null>(null);
  const [newResident, setNewResident] = useState({
    internalCode: '',
    safehouseId: '' as string,
    caseCategory: '',
    caseStatus: '',
  });

  function resetAddResidentForm() {
    setNewResident({ internalCode: '', safehouseId: '', caseCategory: '', caseStatus: '' });
    setAddResidentError(null);
  }

  async function handleAddResident(e: FormEvent) {
    e.preventDefault();
    setAddResidentSubmitting(true);
    setAddResidentError(null);
    try {
      await apiFetch('/api/residents', {
        method: 'POST',
        body: JSON.stringify({
          internalCode: newResident.internalCode.trim(),
          safehouseId: newResident.safehouseId ? Number(newResident.safehouseId) : null,
          caseCategory: newResident.caseCategory || null,
          caseStatus: newResident.caseStatus || null,
        }),
      });
      setShowAddResident(false);
      resetAddResidentForm();
      fetchMetrics();
      fetchSafehouses();
    } catch (err: unknown) {
      setAddResidentError(err instanceof Error ? err.message : 'Failed to add resident.');
    } finally {
      setAddResidentSubmitting(false);
    }
  }

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

  const totalActivityPages = Math.max(1, Math.ceil(activity.length / ACTIVITY_PAGE_SIZE));

  useEffect(() => {
    setActivityPage((p) => Math.min(p, Math.max(1, totalActivityPages)));
  }, [totalActivityPages]);

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
          <button
            onClick={() => setShowAddResident(true)}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors"
          >
            Add Resident
          </button>
          {QUICK_ACTIONS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors"
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
            <KpiCard label="Active Residents"   value={metrics.activeResidents}             Icon={Users}        iconColor="text-slate-700" />
            <KpiCard label="YTD Donations"      value={formatPeso(metrics.ytdDonations)}    Icon={DollarSign}   iconColor="text-green-600" />
            <KpiCard label="Total Supporters"   value={metrics.totalSupporters}             Icon={HandHeart}    iconColor="text-slate-700" />
            <KpiCard label="Active Safehouses"  value={metrics.activeSafehouses}            Icon={Home}         iconColor="text-slate-700" />
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
        {!activityLoading && !activityError && (() => {
          const paged = activity.slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE);
          return (
            <>
              <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                {activity.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
                )}
                {paged.map((item, idx) => (
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
              {totalActivityPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="px-3 py-1 text-xs border border-gray-300 text-gray-600 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    {activityPage} / {totalActivityPages}
                  </span>
                  <button
                    onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage === totalActivityPages}
                    className="px-3 py-1 text-xs border border-gray-300 text-gray-600 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          );
        })()}
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
                  occupancy={s.activeResidents ?? 0}
                  capacity={s.capacityGirls ?? 0}
                />
              ))}
            </div>
          )
        )}
      </section>

      {/* Add Resident Modal */}
      <Modal
        isOpen={showAddResident}
        onClose={() => { setShowAddResident(false); resetAddResidentForm(); }}
        title="Add Resident"
        size="md"
      >
        <form onSubmit={handleAddResident} className="space-y-4">
          {addResidentError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              {addResidentError}
            </p>
          )}

          <div>
            <label htmlFor="ar-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name / Internal Code <span className="text-red-500">*</span>
            </label>
            <input
              id="ar-name"
              type="text"
              required
              value={newResident.internalCode}
              onChange={(e) => setNewResident((p) => ({ ...p, internalCode: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
              placeholder="e.g. R-2026-042"
            />
          </div>

          <div>
            <label htmlFor="ar-safehouse" className="block text-sm font-medium text-gray-700 mb-1">
              Safehouse
            </label>
            <select
              id="ar-safehouse"
              value={newResident.safehouseId}
              onChange={(e) => setNewResident((p) => ({ ...p, safehouseId: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
            >
              <option value="">-- Select --</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={s.safehouseId}>
                  {displaySafehouseName(s.name)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ar-category" className="block text-sm font-medium text-gray-700 mb-1">
              Case Category
            </label>
            <select
              id="ar-category"
              value={newResident.caseCategory}
              onChange={(e) => setNewResident((p) => ({ ...p, caseCategory: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
            >
              <option value="">-- Select --</option>
              {CASE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ar-status" className="block text-sm font-medium text-gray-700 mb-1">
              Case Status
            </label>
            <select
              id="ar-status"
              value={newResident.caseStatus}
              onChange={(e) => setNewResident((p) => ({ ...p, caseStatus: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
            >
              <option value="">-- Select --</option>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddResident(false); resetAddResidentForm(); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addResidentSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {addResidentSubmitting ? 'Adding...' : 'Add Resident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
