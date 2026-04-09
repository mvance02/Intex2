import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useHomeVisitations } from '../../hooks/useHomeVisitations';
import DataTable, { type Column } from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import Modal from '../../components/shared/Modal';
import DeleteConfirmDialog from '../../components/shared/DeleteConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import EmptyState from '../../components/shared/EmptyState';
import { apiFetch } from '../../utils/api';
import type { HomeVisitation, Resident, PaginatedResponse } from '../../types/models';

const VISIT_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
];

const COOPERATION_LEVELS = ['Cooperative', 'Partially Cooperative', 'Uncooperative', 'Not Present'];

const emptyForm = (): Omit<HomeVisitation, 'visitationId'> => ({
  residentId: null,
  visitDate: null,
  socialWorker: null,
  visitType: null,
  locationVisited: null,
  familyMembersPresent: null,
  purpose: null,
  observations: null,
  familyCooperationLevel: null,
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: null,
  visitOutcome: null,
});

function residentLabel(r: Resident): string {
  return `Resident #${r.residentId} — ${r.caseControlNo ?? r.internalCode ?? 'Unknown'}`;
}

export default function HomeVisitations() {
  const toast = useToast();

  useEffect(() => {
    document.title = 'Home Visitations — Hope Haven';
  }, []);

  // --- List state ---
  const { visitations, totalPages, page, setPage, loading, error, filterResidentId, setFilterResidentId, filterVisitType, setFilterVisitType, refresh } = useHomeVisitations();

  // --- Residents for selects ---
  const [residents, setResidents] = useState<Resident[]>([]);

  // --- Modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HomeVisitation | null>(null);
  const [form, setForm] = useState<Omit<HomeVisitation, 'visitationId'>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- Delete state ---
  const [deleteTarget, setDeleteTarget] = useState<HomeVisitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load residents once
  useEffect(() => {
    apiFetch<PaginatedResponse<Resident>>('/api/residents?pageSize=200')
      .then((data) => setResidents(data.items))
      .catch(() => {/* non-critical */});
  }, []);

  const handleResidentFilterChange = (value: string) => {
    setFilterResidentId(value);
    setPage(1);
  };

  const handleVisitTypeFilterChange = (value: string) => {
    setFilterVisitType(value);
    setPage(1);
  };

  // --- Modal helpers ---
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (v: HomeVisitation) => {
    setEditTarget(v);
    const { visitationId: _id, ...rest } = v;
    setForm(rest);
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!form.residentId) { setSaveError('Resident is required'); return; }
    if (!form.visitDate) { setSaveError('Visit date is required'); return; }
    if (!form.socialWorker?.trim()) { setSaveError('Social worker is required'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/homevisitations/${editTarget.visitationId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, visitationId: editTarget.visitationId }),
        });
      } else {
        await apiFetch('/api/homevisitations', {
          method: 'POST',
          body: JSON.stringify({ ...form, visitationId: 0 }),
        });
      }
      toast.success(editTarget ? 'Visit updated.' : 'Visit saved.');
      closeModal();
      void refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/homevisitations/${deleteTarget.visitationId}`, { method: 'DELETE' });
      toast.success('Visit deleted.');
      setDeleteTarget(null);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Table columns ---
  const columns: Column<HomeVisitation>[] = [
    {
      key: 'visitDate',
      header: 'Date',
      sortable: true,
      render: (row) =>
        row.visitDate ? new Date(row.visitDate).toLocaleDateString() : '—',
    },
    {
      key: 'residentId',
      header: 'Resident',
      render: (row) => (row.residentId ? `#${row.residentId}` : '—'),
    },
    {
      key: 'socialWorker',
      header: 'Social Worker',
      sortable: true,
      render: (row) => row.socialWorker ?? '—',
    },
    {
      key: 'visitType',
      header: 'Visit Type',
      render: (row) => row.visitType ?? '—',
    },
    {
      key: 'locationVisited',
      header: 'Location',
      render: (row) => row.locationVisited ?? '—',
    },
    {
      key: 'familyCooperationLevel',
      header: 'Cooperation Level',
      render: (row) => row.familyCooperationLevel ?? '—',
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.safetyConcernsNoted && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
              ⚠ Safety
            </span>
          )}
          {row.followUpNeeded && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
              📋 Follow-up
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="px-3 py-1 text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            className="px-3 py-1 text-xs border border-red-300 text-red-600 hover:bg-red-50 font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Home Visitations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Field visit records</p>
        </div>
        <button
          onClick={openCreate}
          className="self-start sm:self-auto px-4 py-2 bg-blue-600 text-white text-xs font-semibold uppercase tracking-[0.08em] hover:bg-blue-700 transition-colors"
        >
          + Add Visit
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filterResidentId}
          onChange={(e) => handleResidentFilterChange(e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Residents</option>
          {residents.map((r) => (
            <option key={r.residentId} value={String(r.residentId)}>
              {residentLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={filterVisitType}
          onChange={(e) => handleVisitTypeFilterChange(e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Visit Types</option>
          {VISIT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} onRetry={refresh} />
      ) : visitations.length === 0 ? (
        <EmptyState
          Icon={Home}
          title="No visitations found"
          message="Adjust your filters or add a new visit to get started."
          action={
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold uppercase tracking-[0.08em] hover:bg-blue-700"
            >
              Add Visit
            </button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={visitations}
            rowKey={(v) => v.visitationId}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Visit' : 'New Visit'}
        size="xl"
      >
        <div className="space-y-4">
          {saveError && <ErrorAlert message={saveError} />}

          {/* Resident */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <select
              value={form.residentId ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  residentId: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select resident…</option>
              {residents.map((r) => (
                <option key={r.residentId} value={r.residentId}>
                  {residentLabel(r)}
                </option>
              ))}
            </select>
          </div>

          {/* Visit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visit Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.visitDate?.slice(0, 10) ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Social Worker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Social Worker <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.socialWorker ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, socialWorker: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
            <select
              value={form.visitType ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, visitType: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type…</option>
              {VISIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Visited</label>
            <input
              type="text"
              value={form.locationVisited ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, locationVisited: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Family Members Present */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family Members Present
            </label>
            <input
              type="text"
              value={form.familyMembersPresent ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, familyMembersPresent: e.target.value || null }))
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              value={form.purpose ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
            <textarea
              rows={4}
              value={form.observations ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Family Cooperation Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family Cooperation Level
            </label>
            <select
              value={form.familyCooperationLevel ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, familyCooperationLevel: e.target.value || null }))
              }
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select level…</option>
              {COOPERATION_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Visit Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Outcome</label>
            <input
              type="text"
              value={form.visitOutcome ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, visitOutcome: e.target.value || null }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.safetyConcernsNoted}
                onChange={(e) =>
                  setForm((f) => ({ ...f, safetyConcernsNoted: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Safety Concerns Noted
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.followUpNeeded}
                onChange={(e) =>
                  setForm((f) => ({ ...f, followUpNeeded: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Follow-Up Needed
            </label>
          </div>

          {/* Follow-Up Notes — conditional */}
          {form.followUpNeeded && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-Up Notes
              </label>
              <textarea
                rows={3}
                value={form.followUpNotes ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, followUpNotes: e.target.value || null }))
                }
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
              )}
              {editTarget ? 'Save Changes' : 'Create Visit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        itemLabel={
          deleteTarget
            ? `Visit on ${
                deleteTarget.visitDate
                  ? new Date(deleteTarget.visitDate).toLocaleDateString()
                  : 'unknown date'
              } at ${deleteTarget.locationVisited ?? 'unknown location'}`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
