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
import type { SafehouseSummaryItem } from '../../types/models';
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

interface DemoBlogPost {
  id: number;
  title: string;
  summary: string;
  tags: string[];
}

const DEMO_BLOG_POSTS: DemoBlogPost[] = [
  { id: 1, title: 'From Safe Bed to School Desk: Ana\'s First 90 Days', summary: 'A look at how stable housing and daily structure helped Ana return to class and rebuild confidence.', tags: ['education', 'school', 'shelter'] },
  { id: 2, title: 'What Healing Looks Like in Week One of Counseling', summary: 'Our counselors share small but powerful signs of progress in trauma recovery.', tags: ['healing', 'counseling', 'trauma'] },
  { id: 3, title: 'A Day Inside Hope Haven: Meals, Mentors, and Milestones', summary: 'Follow one full day of routines that create safety and consistency for girls in care.', tags: ['shelter', 'care', 'home'] },
  { id: 4, title: 'Back to Learning: Catch-Up Classes That Change Outcomes', summary: 'How targeted tutoring supports girls who have missed years of school.', tags: ['education', 'learning', 'training'] },
  { id: 5, title: 'When Trust Returns: The First Month of Emotional Recovery', summary: 'Stories from social workers on restoring trust and stability after crisis.', tags: ['healing', 'therapy', 'wellbeing'] },
  { id: 6, title: 'Safety First: How Referrals Become Protection Plans', summary: 'An inside look at how our team moves quickly from referral to safe placement.', tags: ['protection', 'safe', 'shelter'] },
  { id: 7, title: 'Small Wins in Class Become Big Wins in Life', summary: 'Why attendance and classroom confidence are early signals of long-term success.', tags: ['education', 'class', 'study'] },
  { id: 8, title: 'The Role of Group Sessions in Trauma-Informed Care', summary: 'How peer support and guided sessions help girls process difficult experiences.', tags: ['healing', 'counsel', 'mental'] },
  { id: 9, title: 'Creating Home: Why Predictable Routines Matter', summary: 'From evening check-ins to shared meals, routines create emotional safety.', tags: ['home', 'housing', 'care'] },
  { id: 10, title: 'Learning Goals After Reintegration: Staying on Track', summary: 'How girls continue school momentum after transitioning to community placements.', tags: ['education', 'school', 'growth'] },
  { id: 11, title: 'Counseling Myths We Hear Most Often', summary: 'Our clinical team answers common questions about therapy and long-term healing.', tags: ['healing', 'therapy', 'counseling'] },
  { id: 12, title: 'What a Safer Tomorrow Starts With Today', summary: 'A practical guide to the first support steps after a high-risk referral.', tags: ['shelter', 'protection', 'safe'] },
];

function formatMonth(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export default function ImpactDashboard() {
  const [trends, setTrends] = useState<DonationTrendPoint[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseSummaryItem[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<DonationTrendsResponse>('/api/reports/donation-trends'),
      apiFetch<SafehouseSummaryItem[]>('/api/dashboard/safehouse-summary'),
    ])
      .then(([trendsRes, safehousesRes]) => {
        setTrends(trendsRes.trends ?? []);
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

  const totalReportPages = Math.max(1, Math.ceil(DEMO_BLOG_POSTS.length / REPORTS_PAGE_SIZE));
  const reportStart = (reportPage - 1) * REPORTS_PAGE_SIZE;
  const paginatedBlogs = DEMO_BLOG_POSTS.slice(reportStart, reportStart + REPORTS_PAGE_SIZE);

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

          {/* Paginated demo blog reports */}
          {DEMO_BLOG_POSTS.length > 0 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-[0.04em] text-slate-900 mb-4">Demo Blog Library</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {paginatedBlogs.map((blog) => (
                    <article
                      key={blog.id}
                      className="bg-white border border-slate-200 shadow-sm p-6"
                    >
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-[0.08em]">Demo Post</p>
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {blog.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {blog.summary}
                    </p>
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
