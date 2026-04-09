import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiFetch, displaySafehouseName } from '../../utils/api'
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

interface RiskLevelCount {
  riskLevel: string | null
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
  byRiskLevel: RiskLevelCount[]
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
  primary: '#2563eb',
  secondary: '#3b82f6',
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
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-sky-50 border border-sky-100 px-4 py-3">
      <span className="text-xs font-semibold text-slate-700 uppercase tracking-[0.08em]">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 border border-gray-200 px-4 py-4 flex-1 min-w-[130px]">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-[0.08em]">{label}</span>
      <span className="text-lg font-bold text-slate-700">{value}</span>
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
      const results = await Promise.allSettled([
        apiFetch<DonationTrendsResponse>(`/api/reports/donation-trends?startYear=${start}&endYear=${end}`),
        apiFetch<ResidentOutcomesResponse>(`/api/reports/resident-outcomes?startYear=${start}&endYear=${end}`),
        apiFetch<SafehouseComparisonResponse>('/api/reports/safehouse-comparison'),
        apiFetch<ReintegrationResponse>('/api/reports/reintegration'),
        apiFetch<AnnualSummary>(`/api/reports/annual-summary?year=${end}`),
      ])
      if (results[0].status === 'fulfilled') setDonationData(results[0].value)
      if (results[1].status === 'fulfilled') setResidentData(results[1].value)
      if (results[2].status === 'fulfilled') setSafehouseData(results[2].value)
      if (results[3].status === 'fulfilled') setReintData(results[3].value)
      if (results[4].status === 'fulfilled') setAnnualData(results[4].value)
      const allFailed = results.every((r) => r.status === 'rejected')
      if (allFailed) setError('Failed to load report data.')
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

  function generatePDF() {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // teal
    doc.text('Hope Haven Impact Report', 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reporting Period: ${appliedStart} \u2014 ${appliedEnd}`, 20, 33);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, 20, 39);

    // Line separator
    doc.setDrawColor(13, 148, 136);
    doc.line(20, 43, 190, 43);

    let y = 55;

    // Annual Summary
    if (annualData) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Annual Summary', 20, y);
      y += 10;

      const summaryRows = [
        ['Total Donations', formatPeso(annualData.totalDonations)],
        ['Donation Count', annualData.donationCount.toString()],
        ['Sessions Logged', annualData.sessionCount.toString()],
        ['Visits Conducted', annualData.visitCount.toString()],
        ['Incidents Reported', annualData.incidentCount.toString()],
        ['Reintegrations', annualData.reintegrationCount.toString()],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryRows,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        margin: { left: 20, right: 20 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Safehouse Comparison
    if (safehouseData) {
      doc.setFontSize(14);
      doc.text('Safehouse Overview', 20, y);
      y += 10;

      const shRows = safehouseData.safehouses.map(s => [
        displaySafehouseName(s.name),
        s.region ?? '',
        `${s.activeResidents}/${s.capacityGirls ?? 0}`,
        s.openIncidents.toString(),
        s.highRiskResidents.toString(),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Safehouse', 'Region', 'Occupancy', 'Open Incidents', 'High Risk']],
        body: shRows,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        margin: { left: 20, right: 20 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Reintegration Stats
    if (reintData) {
      if (y > 240) { doc.addPage(); y = 25; }
      doc.setFontSize(14);
      doc.text('Reintegration Outcomes', 20, y);
      y += 10;

      const reintRows = reintData.byType.map(r => [
        r.reintegrationType ?? 'Unknown',
        r.count.toString(),
        r.reintegratedCount.toString(),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Type', 'Total', 'Reintegrated']],
        body: reintRows,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        margin: { left: 20, right: 20 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Hope Haven Foundation \u2014 Confidential Impact Report', 20, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
    }

    doc.save(`HopeHaven_Impact_Report_${appliedStart}-${appliedEnd}.pdf`);
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

  const riskChartData = (residentData?.byRiskLevel ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: r.riskLevel ?? 'Unknown',
      count: r.count,
      color: riskColor(r.riskLevel),
    }))

  const safehouseChartData = safehouseData?.safehouses.map((sh) => ({
    name: displaySafehouseName(sh.name),
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
              className="ml-2 w-24 border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="ml-2 w-24 border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-4 py-2 bg-white border border-sky-300 text-slate-900 text-xs font-semibold uppercase tracking-[0.08em] hover:bg-sky-300 hover:text-slate-900 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={generatePDF}
            disabled={loading || !annualData}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold uppercase tracking-[0.08em] hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FileDown size={16} />
            Generate Impact Report
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner size="lg" label="Loading report data\u2026" />}

      {error && !loading && <ErrorAlert message={error} onRetry={handleRetry} />}

      {!loading && !error && (
        <div className="space-y-6">

          {/* Section 1: Donation Trends */}
          <Card title="Donation Trends">
            {donationData ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data available for this section.</p>
            )}
          </Card>

          {/* Section 2: Resident Outcomes */}
          <Card title="Resident Outcomes">
            {residentData ? (
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
                      <Bar dataKey="count" name="Residents" fill={COLORS.primary} radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-3">By Risk Level</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={riskChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(value) => [Number(value), 'Residents']} />
                      <Bar dataKey="count" name="Residents" radius={0}>
                        {riskChartData.map((entry, index) => (
                          <Cell key={`risk-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data available for this section.</p>
            )}
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
            {safehouseData ? (
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
                  <Bar dataKey="activeResidents" name="Active Residents" fill={COLORS.primary} radius={0} />
                  <Bar dataKey="capacity" name="Capacity (Girls)" fill={COLORS.secondary} radius={0} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data available for this section.</p>
            )}
          </Card>

          {/* Section 5: Reintegration Stats */}
          <Card title="Reintegration Stats">
            {reintData ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(220, reintChartData.length * 50)}>
                  <BarChart
                    data={reintChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    barSize={24}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={160} interval={0} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill={COLORS.accent} radius={0} />
                  </BarChart>
                </ResponsiveContainer>

                <p className="mt-4 text-sm font-medium text-gray-600">
                  <span className="text-slate-700 font-bold">
                    {reintData.totalReintegrated.toLocaleString()}
                  </span>{' '}
                  residents successfully reintegrated
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data available for this section.</p>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}
