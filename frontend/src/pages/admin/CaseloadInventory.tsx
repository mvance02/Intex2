import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Pagination from '../../components/shared/Pagination'
import FilterBar from '../../components/shared/FilterBar'
import SkeletonLoader from '../../components/shared/SkeletonLoader'
import ErrorAlert from '../../components/shared/ErrorAlert'
import { apiFetch, displaySafehouseName } from '../../utils/api'
import type { Resident, Safehouse, PaginatedResponse } from '../../types/models'

const PAGE_SIZE = 20

type ReadinessLabel = 'High' | 'Medium' | 'Low'
interface ReadinessPrediction {
  readiness_score: number
  readiness_label: ReadinessLabel
  predicted_type: string
}

function ReadinessBadge({ score }: { score: ReadinessPrediction | null | 'loading' }) {
  if (score === 'loading') return <span className="text-gray-400 text-xs">…</span>
  if (!score) return <span className="text-gray-300 text-xs">—</span>
  const map: Record<ReadinessLabel, string> = {
    High:   'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low:    'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] ${map[score.readiness_label]}`}
      title={`${Math.round(score.readiness_score * 100)}% — ${score.predicted_type}`}
    >
      {score.readiness_label} ({Math.round(score.readiness_score * 100)}%)
    </span>
  )
}

function RiskBadge({ level }: { level: string | null }): React.ReactElement {
  const map: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  }
  if (!level) return <span className="text-gray-400">—</span>
  const cls = map[level] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] ${cls}`}>
      {level}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }): React.ReactElement {
  if (!status) return <span className="text-gray-400">—</span>
  let cls = 'bg-gray-100 text-gray-600'
  if (status === 'Active') cls = 'bg-blue-100 text-blue-700'
  else if (status === 'Reintegrated') cls = 'bg-blue-100 text-blue-700'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] ${cls}`}>
      {status}
    </span>
  )
}

function buildColumns(
  readiness: Map<number, ReadinessPrediction | 'loading'>,
): Column<Resident>[] {
  return [
    { key: 'caseControlNo', header: 'Case No', sortable: true },
    { key: 'internalCode', header: 'Internal Code', sortable: true },
    {
      key: 'safehouse',
      header: 'Safehouse',
      render: (r) => displaySafehouseName(r.safehouse?.name),
    },
    { key: 'caseCategory', header: 'Category', sortable: true },
    {
      key: 'caseStatus',
      header: 'Status',
      render: (r) => <StatusBadge status={r.caseStatus} />,
    },
    {
      key: 'currentRiskLevel',
      header: 'Risk Level',
      render: (r) => <RiskBadge level={r.currentRiskLevel} />,
    },
    {
      key: 'residentId',
      header: 'Readiness',
      render: (r) => (
        <ReadinessBadge score={readiness.get(r.residentId) ?? null} />
      ),
    },
    { key: 'assignedSocialWorker', header: 'Social Worker', sortable: true },
    {
      key: 'dateOfAdmission',
      header: 'Date Admitted',
      sortable: true,
      render: (r) =>
        r.dateOfAdmission ? new Date(r.dateOfAdmission).toLocaleDateString() : '—',
    },
  ]
}

export default function CaseloadInventory() {
  const navigate = useNavigate()

  const [residents, setResidents] = useState<Resident[]>([])
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<Map<number, ReadinessPrediction | 'loading'>>(new Map())
  const [predictionsLoaded, setPredictionsLoaded] = useState(false)
  const [predictionsLoading, setPredictionsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    caseStatus: '',
    riskLevel: '',
    caseCategory: '',
    safehouseId: '',
  })

  useEffect(() => {
    document.title = 'Caseload — Hope Haven'
    apiFetch<Safehouse[]>('/api/safehouses')
      .then(setSafehouses)
      .catch(() => {})
  }, [])

  const fetchReadinessScores = useCallback(async (items: Resident[]) => {
    if (items.length === 0) return
    setPredictionsLoading(true)
    // Mark all as loading immediately so the UI shows spinners
    setReadiness((prev) => {
      const next = new Map(prev)
      items.forEach((r) => next.set(r.residentId, 'loading'))
      return next
    })
    try {
      // Single batch request → 1 round trip instead of 20
      const batch = await apiFetch<Record<string, ReadinessPrediction | null>>(
        '/api/predict/reintegration/batch',
        {
          method: 'POST',
          body: JSON.stringify({ residentIds: items.map((r) => r.residentId) }),
        }
      )
      setReadiness((prev) => {
        const next = new Map(prev)
        for (const [id, pred] of Object.entries(batch)) {
          if (pred) next.set(Number(id), pred)
          else next.delete(Number(id))
        }
        return next
      })
    } catch {
      // ML service unavailable — clear loading states silently
      setReadiness((prev) => {
        const next = new Map(prev)
        items.forEach((r) => next.delete(r.residentId))
        return next
      })
    } finally {
      setPredictionsLoading(false)
      setPredictionsLoaded(true)
    }
  }, [])

  const fetchResidents = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      search,
      caseStatus: filterValues.caseStatus,
      safehouseId: filterValues.safehouseId,
      caseCategory: filterValues.caseCategory,
      riskLevel: filterValues.riskLevel,
    })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    apiFetch<PaginatedResponse<Resident>>(`/api/residents?${params.toString()}`)
      .then((data) => {
        setResidents(data.items)
        setTotalPages(data.totalPages)
        setPredictionsLoaded(false)
        void fetchReadinessScores(data.items)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load residents.')
      })
      .finally(() => setLoading(false))
  }, [page, search, filterValues, dateFrom, dateTo])

  useEffect(() => {
    fetchResidents()
  }, [fetchResidents])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const filterGroups = [
    {
      key: 'caseStatus',
      label: 'Case Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Closed', value: 'Closed' },
        { label: 'Reintegrated', value: 'Reintegrated' },
      ],
    },
    {
      key: 'riskLevel',
      label: 'Risk Level',
      options: [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' },
      ],
    },
    {
      key: 'caseCategory',
      label: 'Case Category',
      options: [
        { label: 'Abandoned', value: 'Abandoned' },
        { label: 'Foundling', value: 'Foundling' },
        { label: 'Neglected', value: 'Neglected' },
        { label: 'Surrendered', value: 'Surrendered' },
      ],
    },
    {
      key: 'safehouseId',
      label: 'Safehouse',
      options: safehouses.map((s) => ({
        label: displaySafehouseName(s.name) || `Safehouse ${s.safehouseId}`,
        value: String(s.safehouseId),
      })),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caseload Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and filter all resident cases.</p>
      </div>

      <FilterBar
        searchPlaceholder="Search by case no, code, or social worker…"
        onSearch={handleSearch}
        filters={filterGroups}
        onFilterChange={handleFilterChange}
        filterValues={filterValues}
      />

      {/* Date admitted filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 font-medium">Admitted:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Admitted from date"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Admitted to date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            Clear dates
          </button>
        )}

        {/* Readiness predictions button */}
        <div className="ml-auto">
          <button
            onClick={() => fetchReadinessScores(residents)}
            disabled={predictionsLoading || residents.length === 0}
            className="text-xs font-semibold uppercase tracking-[0.08em] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {predictionsLoading && (
              <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin" />
            )}
            {predictionsLoading ? 'Loading…' : predictionsLoaded ? 'Refresh Predictions' : 'Load Readiness Predictions'}
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchResidents} />}

      {loading ? (
        <SkeletonLoader rows={8} columns={8} />
      ) : (
        <DataTable<Resident>
          columns={buildColumns(readiness)}
          data={residents}
          rowKey={(r) => r.residentId}
          onRowClick={(r) => navigate(`/admin/residents/${r.residentId}`)}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
