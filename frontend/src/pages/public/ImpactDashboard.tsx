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
const REPORTS_PAGE_SIZE = 4;

const STORY_QUESTIONS = [
  {
    id: 'education',
    prompt: 'Do you want to read a story about education and long-term growth?',
    keywords: ['school', 'education', 'class', 'learning', 'study', 'training'],
  },
  {
    id: 'healing',
    prompt: 'Are you most interested in counseling and emotional healing stories?',
    keywords: ['counsel', 'healing', 'therapy', 'mental', 'trauma', 'wellbeing'],
  },
  {
    id: 'shelter',
    prompt: 'Do you prefer stories focused on shelter, safety, and daily care?',
    keywords: ['shelter', 'safe', 'housing', 'home', 'care', 'protection'],
  },
] as const;

function formatMonth(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export default function ImpactDashboard() {
  const [trends, setTrends] = useState<DonationTrendPoint[]>([]);
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseSummaryItem[]>([]);
  const [storyStep, setStoryStep] = useState(0);
  const [storyAnswers, setStoryAnswers] = useState<Record<string, boolean>>({});
  const [storyError, setStoryError] = useState<string | null>(null);
  const [recommendedSnapshotId, setRecommendedSnapshotId] = useState<number | null>(null);
  const [reportPage, setReportPage] = useState(1);
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

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    const da = a.snapshotDate ? new Date(a.snapshotDate).getTime() : 0;
    const db = b.snapshotDate ? new Date(b.snapshotDate).getTime() : 0;
    return db - da;
  });

  const totalReportPages = Math.max(1, Math.ceil(sortedSnapshots.length / REPORTS_PAGE_SIZE));
  const reportStart = (reportPage - 1) * REPORTS_PAGE_SIZE;
  const paginatedSnapshots = sortedSnapshots.slice(reportStart, reportStart + REPORTS_PAGE_SIZE);
  const recommendedSnapshot = sortedSnapshots.find((s) => s.snapshotId === recommendedSnapshotId) ?? null;

  function normalizeSnapshotText(snap: PublicImpactSnapshot) {
    return `${snap.headline ?? ''} ${snap.summaryText ?? ''}`.toLowerCase();
  }

  function resetStoryFinder() {
    setStoryStep(0);
    setStoryAnswers({});
    setStoryError(null);
    setRecommendedSnapshotId(null);
  }

  function runStoryMatch(nextAnswers: Record<string, boolean>) {
    const scored = sortedSnapshots.map((snap) => {
      const text = normalizeSnapshotText(snap);
      let score = 0;
      for (const q of STORY_QUESTIONS) {
        const answer = nextAnswers[q.id];
        if (answer === undefined) continue;
        const hasKeyword = q.keywords.some((k) => text.includes(k));
        if (answer && hasKeyword) score += 2;
        if (!answer && !hasKeyword) score += 1;
      }
      return { snap, score };
    });

    scored.sort((a, b) => b.score - a.score);
    if (scored.length > 0 && scored[0].score > 0) {
      setRecommendedSnapshotId(scored[0].snap.snapshotId);
      setStoryError(null);
    } else {
      setRecommendedSnapshotId(null);
      setStoryError('No exact match yet. Try different answers and we will find a better story fit.');
    }
  }

  function handleStoryAnswer(answer: boolean) {
    const question = STORY_QUESTIONS[storyStep];
    const nextAnswers = { ...storyAnswers, [question.id]: answer };
    setStoryAnswers(nextAnswers);

    if (storyStep >= STORY_QUESTIONS.length - 1) {
      runStoryMatch(nextAnswers);
    } else {
      setStoryStep((prev) => prev + 1);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-extrabold uppercase tracking-[0.05em] text-slate-900 mb-2">Our Impact</h1>
      <p className="text-slate-600 mb-10">
        Transparent reporting on how your support is making a difference.
      </p>

      {loading && <LoadingSpinner label="Loading impact data…" />}
      {error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* Donation Trends Chart */}
          <section className="mb-12">
            <h2 className="text-xl font-extrabold uppercase tracking-[0.04em] text-slate-900 mb-4">Donation Trends</h2>
            {chartData.length === 0 ? (
              <p className="text-slate-500 text-sm">No donation data available.</p>
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                      stroke="#334155"
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
              <h2 className="text-xl font-extrabold uppercase tracking-[0.04em] text-slate-900 mb-4">Safehouse Capacity</h2>
              <div className="bg-white border border-slate-200 shadow-sm p-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={safehouses} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="capacityGirls" name="Capacity" fill="#cbd5e1" />
                    <Bar dataKey="activeResidents" name="Active Residents" fill="#475569" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Story finder + paginated reports */}
          {sortedSnapshots.length > 0 && (
            <section className="space-y-8">
              <div className="border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 mb-2">
                  Story Finder
                </p>
                <h2 className="text-xl font-extrabold uppercase tracking-[0.04em] text-slate-900 mb-3">
                  Find a Story That Resonates With You
                </h2>

                {recommendedSnapshot ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Based on your answers, start with this story:</p>
                    <article className="border border-slate-200 bg-white p-4">
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        {recommendedSnapshot.headline?.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {recommendedSnapshot.summaryText?.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                      </p>
                    </article>
                    <button
                      type="button"
                      onClick={resetStoryFinder}
                      className="px-5 py-2 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-slate-100 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700">
                      {STORY_QUESTIONS[storyStep]?.prompt}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleStoryAnswer(true)}
                        className="px-5 py-2 border border-sky-300 bg-white text-sky-700 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-sky-300 hover:text-slate-900 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStoryAnswer(false)}
                        className="px-5 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-slate-100 transition-colors"
                      >
                        No
                      </button>
                    </div>
                    {storyError && <p className="text-sm text-rose-700">{storyError}</p>}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-[0.04em] text-slate-900 mb-4">Impact Reports</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {paginatedSnapshots.map((snap) => (
                    <article
                      key={snap.snapshotId}
                      className="bg-white border border-slate-200 shadow-sm p-6"
                    >
                    {snap.snapshotDate && (
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(snap.snapshotDate).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {snap.headline?.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                    </h3>
                    {snap.summaryText && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {snap.summaryText.replace(/Lighthouse\s+Sanctuary/gi, 'Hope Haven Sanctuary')}
                      </p>
                    )}
                    </article>
                  ))}
                </div>

                {totalReportPages > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">
                      Page {reportPage} of {totalReportPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                        disabled={reportPage === 1}
                        className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                        disabled={reportPage === totalReportPages}
                        className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
