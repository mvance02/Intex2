import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { apiFetch } from '../../utils/api'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorAlert from '../../components/shared/ErrorAlert'

// ── Local interfaces ──────────────────────────────────────────────────────────

interface DonationTrendPoint {
  year: number
  month: number
  totalAmount: number
  donationCount: number
  uniqueSupporters: number
}

interface CurrencyBreakdown {
  currency: string | null
  totalAmount: number
  donationCount: number
}

interface TypeBreakdown {
  donationType: string | null
  totalAmount: number
  donationCount: number
}

interface StatusCount {
  status: string | null
  count: number
}

interface CategoryCount {
  category: string | null
  count: number
}

interface TypeCount {
  reintegrationType: string | null
  count: number
  reintegratedCount: number
}

interface EduCount {
  educationLevel: string | null
  count: number
}

interface HealthScore {
  year: number
  month: number
  avgGeneralHealthScore: number | null
  avgNutritionScore: number | null
  avgSleepQualityScore: number | null
}

interface SafehouseCompare {
  safehouseId: number
  name: string | null
  region: string | null
  status: string | null
  capacityGirls: number | null
  currentOccupancy: number | null
  activeResidents: number
  totalResidents: number
  openIncidents: number
  totalIncidents: number
  highRiskResidents: number
}

interface ReintType {
  reintegrationType: string | null
  count: number
  reintegratedCount: number
}

interface TimePoint {
  year: number
  month: number
  count: number
}

interface AnnualSummary {
  year: number
  totalDonations: number
  donationCount: number
  residentStats: StatusCount[]
  sessionCount: number
  visitCount: number
  incidentCount: number
  reintegrationCount: number
}

// ── API response shapes ───────────────────────────────────────────────────────

interface DonationTrendsResponse {
  trends: DonationTrendPoint[]
  byCurrency: CurrencyBreakdown[]
  byType: TypeBreakdown[]
}

interface ResidentOutcomesResponse {
  byStatus: StatusCount[]
  byRiskLevel: StatusCount[]
  byCategory: CategoryCount[]
  byReintegrationType: TypeCount[]
  educationProgress: EduCount[]
  healthScores: HealthScore[]
}

interface SafehouseComparisonResponse {
  safehouses: SafehouseCompare[]
  monthlyMetrics: MonthlyMetric[]
}

interface MonthlyMetric {
  year: number
  month: number
  [key: string]: number
}

interface ReintegrationResponse {
  byType: ReintType[]
  overTime: TimePoint[]
  totalReintegrated: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

const COLORS = {
  primary: '#0d9488',
  secondary: '#0891b2',
  accent: '#7c3aed',
  danger: '#dc2626',
  warning: '#d97706',
}

const RISK_COLORS: Record<string, string> = {
  Critical: COLORS.danger,
  High: COLORS.warning,
  Medium: '#eab308',
  Low: '#16a34a',
}

function riskColor(status: string | null): string {
  if (status === null) return '#9ca3af'
  return RISK_COLORS[status] ?? '#9ca3af'
}

function formatPeso(value: number): string {
  return `\u20b1${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-teal-50 border border-teal-100 rounded-lg px-4 py-3">
      <span className="text-xs font-medium text-teal-700 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 flex-1 min-w-[130px]">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-lg font-bold text-teal-700">{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsAnalytics() {
  const currentYear = new Date().getFullYear()

  const [startYear, setStartYear] = useState<number>(currentYear - 2)
  const [endYear, setEndYear] = useState<number>(currentYear)
  const [appliedStart, setAppliedStart] = useState<number>(currentYear - 2)
  const [appliedEnd, setAppliedEnd] = useState<number>(currentYear)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [donationData, setDonationData] = useState<DonationTrendsResponse | null>(null)
  const [residentData, setResidentData] = useState<ResidentOutcomesResponse | null>(null)
  const [safehouseData, setSafehouseData] = useState<SafehouseComparisonResponse | null>(null)
  const [reintData, setReintData] = useState<ReintegrationResponse | null>(null)
  const [annualData, setAnnualData] = useState<AnnualSummary | null>(null)

  const fetchAll = useCallback(async (start: number, end: number) => {
    setLoading(true)
    setError(null)
    try {
      const [donations, residents, safehouses, reint, annual] = await Promise.all([
        apiFetch<DonationTrendsResponse>(`/api/reports/donation-trends?startYear=${start}&endYear=${end}`),
        apiFetch<ResidentOutcomesResponse>(`/api/reports/resident-outcomes?startYear=${start}&endYear=${end}`),
        apiFetch<SafehouseComparisonResponse>('/api/reports/safehouse-comparison'),
        apiFetch<ReintegrationResponse>('/api/reports/reintegration'),
        apiFetch<AnnualSummary>(`/api/reports/annual-summary?year=${end}`),
      ])
      setDonationData(donations)
      setResidentData(residents)
      setSafehouseData(safehouses)
      setReintData(reint)
      setAnnualData(annual)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Reports \u2014 Hope Haven'
    fetchAll(appliedStart, appliedEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApply() {
    setAppliedStart(startYear)
    setAppliedEnd(endYear)
    fetchAll(startYear, endYear)
  }

  function handleRetry() {
    fetchAll(appliedStart, appliedEnd)
  }

  // ── Derived chart data ──────────────────────────────────────────────────────

  const trendChartData = donationData?.trends.map((p) => ({
    label: monthLabel(p.year, p.month),
    amount: p.totalAmount,
  })) ?? []

  const statusChartData = residentData?.byStatus.map((s) => ({
    name: s.status ?? 'Unknown',
    count: s.count,
  })) ?? []

  const riskChartData = residentData?.byRiskLevel.map((r) => ({
    name: r.status ?? 'Unknown',
    value: r.count,
    color: riskColor(r.status),
  })) ?? []

  const safehouseChartData = safehouseData?.safehouses.map((sh) => ({
    name: sh.name ?? `Safehouse ${sh.safehouseId}`,
    activeResidents: sh.activeResidents,
    capacity: sh.capacityGirls ?? 0,
  })) ?? []

  const reintChartData = reintData?.byType.map((r) => ({
    name: r.reintegrationType ?? 'Unknown',
    count: r.count,
  })) ?? []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header + year range filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Reports &amp; Analytics</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-600">
            Start Year
            <input
              type="number"
              value={startYear}
              min={2000}
              max={endYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="ml-2 w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>
          <label className="text-sm font-medium text-gray-600">
            End Year
            <input
              type="number"
              value={endYear}
              min={startYear}
              max={currentYear + 5}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="ml-2 w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner size="lg" label="Loading report data\u2026" />}

      {error && !loading && <ErrorAlert message={error} onRetry={handleRetry} />}

      {!loading && !error && (
        <div className="space-y-6">

          {/* Section 1: Donation Trends */}
          <Card title="Donation Trends">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendChartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis
                  tickFormatter={(v: number) => `\u20b1${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip formatter={(value) => [formatPeso(Number(value)), 'Total Amount']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Total Amount (\u20b1)"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {donationData && (
              <div className="mt-4 flex gap-3 flex-wrap">
                <StatBox
                  label="Top Currency"
                  value={
                    donationData.byCurrency[0]
                      ? `${donationData.byCurrency[0].currency ?? 'N/A'} \u2014 ${formatPeso(donationData.byCurrency[0].totalAmount)}`
                      : 'No data'
                  }
                />
                <StatBox
                  label="Top Donation Type"
                  value={
                    donationData.byType[0]
                      ? `${donationData.byType[0].donationType ?? 'N/A'} \u2014 ${donationData.byType[0].donationCount} donations`
                      : 'No data'
                  }
                />
              </div>
            )}
          </Card>

          {/* Section 2: Resident Outcomes */}
          <Card title="Resident Outcomes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">By Status</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={statusChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Residents" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">By Risk Level</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell key={`risk-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [Number(value), 'Residents']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Section 3: Annual Summary */}
          {annualData && (
            <Card title={`Annual Summary \u2014 ${annualData.year}`}>
              <div className="flex flex-wrap gap-3">
                <SummaryCard label="Total Donations" value={formatPeso(annualData.totalDonations)} />
                <SummaryCard label="Donation Count" value={annualData.donationCount.toLocaleString()} />
                <SummaryCard label="Sessions Logged" value={annualData.sessionCount.toLocaleString()} />
                <SummaryCard label="Visits Conducted" value={annualData.visitCount.toLocaleString()} />
                <SummaryCard label="Incidents" value={annualData.incidentCount.toLocaleString()} />
                <SummaryCard label="Reintegrations" value={annualData.reintegrationCount.toLocaleString()} />
              </div>
            </Card>
          )}

          {/* Section 4: Safehouse Comparison */}
          <Card title="Safehouse Comparison">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={safehouseChartData}
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="activeResidents" name="Active Residents" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Capacity (Girls)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Section 5: Reintegration Stats */}
          <Card title="Reintegration Stats">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={reintChartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill={COLORS.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {reintData && (
              <p className="mt-4 text-sm font-medium text-gray-600">
                <span className="text-teal-700 font-bold">
                  {reintData.totalReintegrated.toLocaleString()}
                </span>{' '}
                residents successfully reintegrated
              </p>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}
