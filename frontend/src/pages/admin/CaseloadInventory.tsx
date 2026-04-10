import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Pagination from '../../components/shared/Pagination'
import FilterBar from '../../components/shared/FilterBar'
import SkeletonLoader from '../../components/shared/SkeletonLoader'
import ErrorAlert from '../../components/shared/ErrorAlert'
import Modal from '../../components/shared/Modal'
import DeleteConfirmDialog from '../../components/shared/DeleteConfirmDialog'
import { HelpCircle } from 'lucide-react'
import { apiFetch, displaySafehouseName } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import type { Resident, Safehouse, PaginatedResponse } from '../../types/models'

interface ResidentFormState {
  internalCode: string
  safehouseId: string
  caseCategory: string
  caseStatus: string
}

const EMPTY_FORM: ResidentFormState = {
  internalCode: '',
  safehouseId: '',
  caseCategory: '',
  caseStatus: '',
}

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
  if (status === 'Active') cls = 'bg-sky-100 text-slate-700'
  else if (status === 'Transferred') cls = 'bg-amber-100 text-amber-700'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] ${cls}`}>
      {status}
    </span>
  )
}

function buildColumns(
  readiness: Map<number, ReadinessPrediction | 'loading'>,
  onEdit: (r: Resident) => void,
  onDelete: (r: Resident) => void,
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
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(r)
            }}
            className="text-xs font-semibold uppercase tracking-[0.06em] px-3 py-1 border border-sky-300 text-slate-700 hover:bg-sky-50 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(r)
            }}
            className="text-xs font-semibold uppercase tracking-[0.06em] px-3 py-1 border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]
}

export default function CaseloadInventory() {
  const navigate = useNavigate()
  const toast = useToast()

  const [residents, setResidents] = useState<Resident[]>([])
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<Map<number, ReadinessPrediction | 'loading'>>(new Map())
  const [predictionsLoaded, setPredictionsLoaded] = useState(false)
  const [predictionsLoading, setPredictionsLoading] = useState(false)
  const [predictionError, setPredictionError] = useState<string | null>(null)

  const [statusTooltipOpen, setStatusTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    caseStatus: '',
    riskLevel: '',
    caseCategory: '',
    safehouseId: '',
  })

  // Create / edit form state
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Resident | null>(null)
  const [formState, setFormState] = useState<ResidentFormState>({ ...EMPTY_FORM })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!statusTooltipOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setStatusTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusTooltipOpen])

  useEffect(() => {
    document.title = 'Caseload — Hope Haven'
    apiFetch<Safehouse[]>('/api/safehouses')
      .then(setSafehouses)
      .catch(() => {})
  }, [])

  const fetchReadinessScores = useCallback(async (items: Resident[]) => {
    if (items.length === 0) return
    setPredictionsLoading(true)
    setPredictionError(null)
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
      toast.success('Readiness predictions loaded')
    } catch {
      // ML service unavailable — clear loading states and surface warning
      setReadiness((prev) => {
        const next = new Map(prev)
        items.forEach((r) => next.delete(r.residentId))
        return next
      })
      setPredictionError('Readiness predictions are currently unavailable.')
      toast.error('Readiness predictions unavailable')
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

  const openCreate = useCallback(() => {
    setEditTarget(null)
    setFormState({ ...EMPTY_FORM })
    setFormError(null)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((r: Resident) => {
    setEditTarget(r)
    setFormState({
      internalCode: r.internalCode ?? '',
      safehouseId: r.safehouseId != null ? String(r.safehouseId) : '',
      caseCategory: r.caseCategory ?? '',
      caseStatus: r.caseStatus ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    if (formSaving) return
    setShowForm(false)
    setEditTarget(null)
    setFormError(null)
  }, [formSaving])

  const openDelete = useCallback((r: Resident) => {
    setDeleteTarget(r)
  }, [])

  const closeDelete = useCallback(() => {
    if (deleteLoading) return
    setDeleteTarget(null)
  }, [deleteLoading])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await apiFetch(`/api/residents/${deleteTarget.residentId}`, { method: 'DELETE' })
      toast.success('Resident deleted')
      setDeleteTarget(null)
      fetchResidents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormSaving(true)
    setFormError(null)
    try {
      const payload = {
        internalCode: formState.internalCode.trim(),
        safehouseId: formState.safehouseId ? Number(formState.safehouseId) : null,
        caseCategory: formState.caseCategory || null,
        caseStatus: formState.caseStatus || null,
      }
      if (editTarget) {
        // PUT requires the full Resident object — merge edits over the existing record
        await apiFetch(`/api/residents/${editTarget.residentId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...editTarget, ...payload }),
        })
        toast.success('Resident updated')
      } else {
        await apiFetch('/api/residents', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Resident created')
      }
      setShowForm(false)
      setEditTarget(null)
      fetchResidents()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save resident.')
    } finally {
      setFormSaving(false)
    }
  }

  const filterGroups = [
    {
      key: 'caseStatus',
      label: 'Case Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Closed', value: 'Closed' },
        { label: 'Transferred', value: 'Transferred' },
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caseload Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Browse, create, update, and filter all resident cases.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="text-xs font-semibold uppercase tracking-[0.08em] px-4 py-2 bg-sky-300 text-slate-900 hover:bg-sky-200 transition-colors whitespace-nowrap"
        >
          + New Resident
        </button>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <FilterBar
            searchPlaceholder="Search by case no, code, or social worker…"
            onSearch={handleSearch}
            filters={filterGroups}
            onFilterChange={handleFilterChange}
            filterValues={filterValues}
          />
        </div>
        <div className="relative pt-1" ref={tooltipRef}>
          <button
            type="button"
            onClick={() => setStatusTooltipOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Case status definitions"
            title="Case status definitions"
          >
            <HelpCircle size={16} />
          </button>
          {statusTooltipOpen && (
            <div className="absolute right-0 top-7 z-50 w-72 bg-white border border-gray-200 shadow-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-2">Case Status Definitions</p>
              <p><span className="font-medium text-gray-900">Active</span> — Currently in care at a safehouse</p>
              <p><span className="font-medium text-gray-900">Closed</span> — Case closed, no longer receiving services</p>
              <p><span className="font-medium text-gray-900">Transferred</span> — Moved to a different safehouse or program</p>
            </div>
          )}
        </div>
      </div>

      {/* Date admitted filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 font-medium">Admitted:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Admitted from date"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Admitted to date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-xs text-slate-700 hover:text-slate-700 transition-colors"
          >
            Clear dates
          </button>
        )}

        {/* Readiness predictions button */}
        <div className="ml-auto">
          <button
            onClick={() => fetchReadinessScores(residents)}
            disabled={predictionsLoading || residents.length === 0}
            className="text-xs font-semibold uppercase tracking-[0.08em] px-4 py-2 bg-white border border-sky-300 text-slate-900 hover:bg-sky-300 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {predictionsLoading && (
              <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin" />
            )}
            {predictionsLoading ? 'Loading…' : predictionsLoaded ? 'Refresh Predictions' : 'Load Readiness Predictions'}
          </button>
        </div>
      </div>

      {predictionError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 mb-4">
          {predictionError}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchResidents} />}

      {loading ? (
        <SkeletonLoader rows={8} columns={8} />
      ) : (
        <DataTable<Resident>
          columns={buildColumns(readiness, openEdit, openDelete)}
          data={residents}
          rowKey={(r) => r.residentId}
          onRowClick={(r) => navigate(`/admin/residents/${r.residentId}`)}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editTarget ? 'Edit Resident' : 'Add Resident'}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="res-internal-code" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 mb-1.5">
              Internal Code <span className="text-red-500">*</span>
            </label>
            <input
              id="res-internal-code"
              type="text"
              required
              value={formState.internalCode}
              onChange={(e) => setFormState((p) => ({ ...p, internalCode: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. HH-2026-001"
            />
          </div>

          <div>
            <label htmlFor="res-safehouse" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 mb-1.5">
              Safehouse
            </label>
            <select
              id="res-safehouse"
              value={formState.safehouseId}
              onChange={(e) => setFormState((p) => ({ ...p, safehouseId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">— Select safehouse —</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>
                  {displaySafehouseName(s.name) || `Safehouse ${s.safehouseId}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="res-case-category" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 mb-1.5">
              Case Category
            </label>
            <select
              id="res-case-category"
              value={formState.caseCategory}
              onChange={(e) => setFormState((p) => ({ ...p, caseCategory: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">— Select category —</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Foundling">Foundling</option>
              <option value="Neglected">Neglected</option>
              <option value="Surrendered">Surrendered</option>
            </select>
          </div>

          <div>
            <label htmlFor="res-case-status" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 mb-1.5">
              Case Status
            </label>
            <select
              id="res-case-status"
              value={formState.caseStatus}
              onChange={(e) => setFormState((p) => ({ ...p, caseStatus: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">— Select status —</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeForm}
              disabled={formSaving}
              className="text-xs font-semibold uppercase tracking-[0.08em] px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSaving || !formState.internalCode.trim()}
              className="text-xs font-semibold uppercase tracking-[0.08em] px-4 py-2 bg-sky-300 text-slate-900 hover:bg-sky-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {formSaving && (
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin" />
              )}
              {editTarget ? (formSaving ? 'Saving…' : 'Save Changes') : (formSaving ? 'Creating…' : 'Create Resident')}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        itemLabel={deleteTarget?.internalCode || deleteTarget?.caseControlNo || `Resident #${deleteTarget?.residentId ?? ''}`}
        onConfirm={() => void handleDelete()}
        onCancel={closeDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
