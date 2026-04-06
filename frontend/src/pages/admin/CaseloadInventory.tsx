import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Pagination from '../../components/shared/Pagination'
import FilterBar from '../../components/shared/FilterBar'
import SkeletonLoader from '../../components/shared/SkeletonLoader'
import ErrorAlert from '../../components/shared/ErrorAlert'
import { apiFetch } from '../../utils/api'
import type { Resident, Safehouse, PaginatedResponse } from '../../types/models'

const PAGE_SIZE = 20

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
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {level}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }): React.ReactElement {
  if (!status) return <span className="text-gray-400">—</span>
  let cls = 'bg-gray-100 text-gray-600'
  if (status === 'Active') cls = 'bg-teal-100 text-teal-700'
  else if (status === 'Reintegrated') cls = 'bg-blue-100 text-blue-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

const COLUMNS: Column<Resident>[] = [
  { key: 'caseControlNo', header: 'Case No', sortable: true },
  { key: 'internalCode', header: 'Internal Code', sortable: true },
  {
    key: 'safehouse',
    header: 'Safehouse',
    render: (r) => r.safehouse?.name ?? '—',
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
  { key: 'assignedSocialWorker', header: 'Social Worker', sortable: true },
  {
    key: 'dateOfAdmission',
    header: 'Date Admitted',
    sortable: true,
    render: (r) =>
      r.dateOfAdmission ? new Date(r.dateOfAdmission).toLocaleDateString() : '—',
  },
]

export default function CaseloadInventory() {
  const navigate = useNavigate()

  const [residents, setResidents] = useState<Resident[]>([])
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
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
      .catch(() => {
        // Non-critical — safehouse filter will just be empty
      })
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
    apiFetch<PaginatedResponse<Resident>>(`/api/residents?${params.toString()}`)
      .then((data) => {
        setResidents(data.items)
        setTotalPages(data.totalPages)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load residents.')
      })
      .finally(() => setLoading(false))
  }, [page, search, filterValues])

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
        { label: 'Trafficking', value: 'Trafficking' },
        { label: 'Physical Abuse', value: 'Physical Abuse' },
        { label: 'Sexual Abuse', value: 'Sexual Abuse' },
        { label: 'OSAEC', value: 'OSAEC' },
        { label: 'At Risk', value: 'At Risk' },
        { label: 'Orphaned', value: 'Orphaned' },
      ],
    },
    {
      key: 'safehouseId',
      label: 'Safehouse',
      options: safehouses.map((s) => ({
        label: s.name ?? `Safehouse ${s.safehouseId}`,
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

      {error && <ErrorAlert message={error} onRetry={fetchResidents} />}

      {loading ? (
        <SkeletonLoader rows={8} columns={8} />
      ) : (
        <DataTable<Resident>
          columns={COLUMNS}
          data={residents}
          rowKey={(r) => r.residentId}
          onRowClick={(r) => navigate(`/admin/residents/${r.residentId}`)}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
