import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, TrendingDown, ShieldCheck, Activity, Download } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DonorRiskStats {
  total_donors: number;
  high_priority_count: number;
  avg_risk: number;
  tier_counts: {
    Critical: number;
    High: number;
    Moderate: number;
    Low: number;
  };
}

interface DonorRiskRow {
  supporter_id: number;
  churn_risk: number;
  risk_tier: 'Critical' | 'High' | 'Moderate' | 'Low';
  at_risk_top20: boolean;
  suggested_action: string;
  suggested_why: string;
}

interface DonorRiskResponse {
  donors: DonorRiskRow[];
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIERS = ['All', 'Critical', 'High', 'Moderate', 'Low'] as const;
type TierFilter = typeof TIERS[number];

const TIER_STYLES: Record<string, { badge: string; bar: string; text: string }> = {
  Critical: { badge: 'bg-red-100 text-red-700',    bar: 'bg-red-500',    text: 'text-red-700' },
  High:     { badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400', text: 'text-orange-700' },
  Moderate: { badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400', text: 'text-yellow-700' },
  Low:      { badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500',  text: 'text-green-700' },
};

const PLAYBOOK = [
  { tier: 'Critical', range: '0.75 – 1.00', color: 'border-red-400 bg-red-50', dot: 'bg-red-500',    action: 'Reach out personally this week — call or direct message.' },
  { tier: 'High',     range: '0.50 – 0.74', color: 'border-orange-400 bg-orange-50', dot: 'bg-orange-400', action: 'Send a targeted impact update with an easy donation link.' },
  { tier: 'Moderate', range: '0.25 – 0.49', color: 'border-yellow-400 bg-yellow-50', dot: 'bg-yellow-400', action: 'Add to warm follow-up sequence and monitor engagement.' },
  { tier: 'Low',      range: '0.00 – 0.24', color: 'border-green-400 bg-green-50',  dot: 'bg-green-500',  action: 'Keep in regular nurture campaign.' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskBar(score: number, tier: string) {
  const pct = Math.round(score * 100);
  const { bar } = TIER_STYLES[tier] ?? TIER_STYLES.Low;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600">{(score).toFixed(2)}</span>
    </div>
  );
}

function tierBadge(tier: string) {
  const { badge } = TIER_STYLES[tier] ?? TIER_STYLES.Low;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge}`}>
      {tier}
    </span>
  );
}

function downloadCsv(donors: DonorRiskRow[]) {
  const headers = ['Donor ID', 'Risk Score', 'Risk Level', 'High Priority', 'Suggested Next Step', 'Reason'];
  const rows = donors.map((d) => [
    d.supporter_id,
    d.churn_risk.toFixed(4),
    d.risk_tier,
    d.at_risk_top20 ? 'Yes' : 'No',
    `"${d.suggested_action.replace(/"/g, '""')}"`,
    `"${d.suggested_why.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'donor_risk_filtered.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DonorRetentionRisk() {
  const [stats, setStats] = useState<DonorRiskStats | null>(null);
  const [donors, setDonors] = useState<DonorRiskRow[]>([]);
  const [tierFilter, setTierFilter] = useState<TierFilter>('All');
  const [statsLoading, setStatsLoading] = useState(true);
  const [donorsLoading, setDonorsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [donorsError, setDonorsError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Donor Retention Risk — Hope Haven';
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await apiFetch<DonorRiskStats>('/api/donor-risk/stats');
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Could not load stats. Is the donor risk service running?');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadDonors = useCallback(async (tier: TierFilter) => {
    setDonorsLoading(true);
    setDonorsError(null);
    try {
      const query = tier === 'All' ? '' : `?tier=${tier}`;
      const data = await apiFetch<DonorRiskResponse>(`/api/donor-risk/all${query}`);
      setDonors(data.donors);
    } catch (err) {
      setDonorsError(err instanceof Error ? err.message : 'Could not load donor list.');
    } finally {
      setDonorsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => { void loadDonors(tierFilter); }, [loadDonors, tierFilter]);

  const serviceDown = statsError?.toLowerCase().includes('reachable') || statsError?.toLowerCase().includes('503');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Donor Retention Risk</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          XGBoost predictions — donors most likely to stop giving in the next 180 days.
        </p>
      </div>

      {/* Service-down banner */}
      {serviceDown && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            Donor risk service is offline. Start it with:{' '}
            <code className="font-mono bg-amber-100 px-1">
              uvicorn donor_retention_risk_api:app --port 8003
            </code>
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-4 flex justify-center py-6">
            <LoadingSpinner size="sm" label="Loading stats…" />
          </div>
        ) : statsError && !serviceDown ? (
          <div className="col-span-4">
            <ErrorAlert message={statsError} onRetry={() => void loadStats()} />
          </div>
        ) : stats ? (
          <>
            <KpiCard
              Icon={Activity}
              label="Total Donors"
              value={stats.total_donors.toLocaleString()}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <KpiCard
              Icon={AlertTriangle}
              label="High Priority"
              value={stats.high_priority_count.toLocaleString()}
              iconColor="text-red-600"
              iconBg="bg-red-50"
            />
            <KpiCard
              Icon={TrendingDown}
              label="Avg Risk Score"
              value={stats.avg_risk.toFixed(2)}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
            />
            <KpiCard
              Icon={ShieldCheck}
              label="Critical Donors"
              value={stats.tier_counts.Critical.toLocaleString()}
              iconColor="text-rose-600"
              iconBg="bg-rose-50"
            />
          </>
        ) : null}
      </div>

      {/* Tier summary + playbook */}
      {stats && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Tier bar chart */}
          <div className="bg-white border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Risk Distribution</h2>
            <div className="space-y-3">
              {(['Critical', 'High', 'Moderate', 'Low'] as const).map((t) => {
                const count = stats.tier_counts[t];
                const pct = stats.total_donors > 0 ? (count / stats.total_donors) * 100 : 0;
                const { bar, text } = TIER_STYLES[t];
                return (
                  <div key={t} className="flex items-center gap-3">
                    <span className={`w-16 text-xs font-semibold ${text}`}>{t}</span>
                    <div className="flex-1 h-2 bg-gray-100 overflow-hidden">
                      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playbook */}
          <div className="bg-white border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Outreach Playbook</h2>
            <div className="space-y-3">
              {PLAYBOOK.map(({ tier, range, color, dot, action }) => (
                <div key={tier} className={`border-l-4 px-3 py-2 text-sm ${color}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-2 h-2 shrink-0 ${dot}`} />
                    <span className="font-semibold text-gray-800">{tier}</span>
                    <span className="text-xs text-gray-400">{range}</span>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed pl-4">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Donor table */}
      <div className="bg-white border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Donor List — Highest Risk First</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier filter tabs */}
            <div className="flex border border-gray-200 overflow-hidden text-xs font-medium">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-3 py-1.5 transition-colors ${
                    tierFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* CSV download */}
            <button
              onClick={() => downloadCsv(donors)}
              disabled={donors.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {donorsError && (
          <div className="p-4">
            <ErrorAlert message={donorsError} onRetry={() => void loadDonors(tierFilter)} />
          </div>
        )}

        {donorsLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="sm" label="Loading donors…" />
          </div>
        ) : donors.length === 0 && !donorsError ? (
          <p className="text-sm text-gray-400 text-center py-10">No donors match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">Donor ID</th>
                  <th className="px-5 py-3 text-left font-medium">Risk Score</th>
                  <th className="px-5 py-3 text-left font-medium">Level</th>
                  <th className="px-5 py-3 text-left font-medium">Priority</th>
                  <th className="px-5 py-3 text-left font-medium">Suggested Action</th>
                  <th className="px-5 py-3 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donors.map((d) => (
                  <tr key={d.supporter_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">#{d.supporter_id}</td>
                    <td className="px-5 py-3">{riskBar(d.churn_risk, d.risk_tier)}</td>
                    <td className="px-5 py-3">{tierBadge(d.risk_tier)}</td>
                    <td className="px-5 py-3">
                      {d.at_risk_top20 ? (
                        <span className="text-xs font-medium text-red-600">Top 20%</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs">
                      <p className="line-clamp-2 text-xs leading-relaxed">{d.suggested_action}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-400 max-w-xs">
                      <p className="line-clamp-2 text-xs leading-relaxed">{d.suggested_why}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {donors.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {donors.length.toLocaleString()} donor{donors.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KpiCard({
  Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  Icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`p-2.5 shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
