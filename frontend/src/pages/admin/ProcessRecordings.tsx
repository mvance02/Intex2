import { useEffect, useState, useRef } from 'react';
import { ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useProcessRecordings } from '../../hooks/useProcessRecordings';
import DataTable, { type Column } from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import Modal from '../../components/shared/Modal';
import DeleteConfirmDialog from '../../components/shared/DeleteConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import EmptyState from '../../components/shared/EmptyState';
import { apiFetch } from '../../utils/api';
import type { ProcessRecording, Resident, PaginatedResponse } from '../../types/models';

const SESSION_TYPES = [
  'Individual Counseling',
  'Group Session',
  'Family Session',
  'Crisis Intervention',
  'Assessment',
  'Follow-Up',
  'Other',
];

const EMOTIONAL_STATES = ['Calm', 'Anxious', 'Withdrawn', 'Angry', 'Sad', 'Hopeful', 'Other'];

const emptyForm = (): Omit<ProcessRecording, 'recordingId'> => ({
  residentId: null,
  sessionDate: null,
  socialWorker: null,
  sessionType: null,
  sessionDurationMinutes: null,
  emotionalStateObserved: null,
  emotionalStateEnd: null,
  sessionNarrative: null,
  interventionsApplied: null,
  followUpActions: null,
  progressNoted: false,
  concernsFlagged: false,
  referralMade: false,
  notesRestricted: null,
});

function residentLabel(r: Resident): string {
  return `Resident #${r.residentId} — ${r.caseControlNo ?? r.internalCode ?? 'Unknown'}`;
}

export default function ProcessRecordings() {
  const toast = useToast();

  useEffect(() => {
    document.title = 'Process Recordings — Hope Haven';
  }, []);

  // --- List state ---
  const { recordings, totalPages, page, setPage, loading, error, filterResidentId, setFilterResidentId, setFilterSocialWorker, refresh } = useProcessRecordings();

  // --- Filters ---
  const [socialWorkerInput, setSocialWorkerInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Residents for selects ---
  const [residents, setResidents] = useState<Resident[]>([]);

  // --- Modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProcessRecording | null>(null);
  const [form, setForm] = useState<Omit<ProcessRecording, 'recordingId'>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- Delete state ---
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load residents once
  useEffect(() => {
    apiFetch<PaginatedResponse<Resident>>('/api/residents?pageSize=200')
      .then((data) => setResidents(data.items))
      .catch(() => {/* non-critical */});
  }, []);

  // Debounce social worker filter
  const handleSocialWorkerInputChange = (value: string) => {
    setSocialWorkerInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilterSocialWorker(value);
      setPage(1);
    }, 300);
  };

  const handleResidentFilterChange = (value: string) => {
    setFilterResidentId(value);
    setPage(1);
  };

  // --- Modal helpers ---
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (rec: ProcessRecording) => {
    setEditTarget(rec);
    const { recordingId: _id, ...rest } = rec;
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
    if (!form.sessionDate) { setSaveError('Session date is required'); return; }
    if (!form.socialWorker?.trim()) { setSaveError('Social worker is required'); return; }
    if (!form.sessionNarrative || form.sessionNarrative.length < 20) {
      setSaveError('Session narrative must be at least 20 characters');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/processrecordings/${editTarget.recordingId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, recordingId: editTarget.recordingId }),
        });
      } else {
        await apiFetch('/api/processrecordings', {
          method: 'POST',
          body: JSON.stringify({ ...form, recordingId: 0 }),
        });
      }
      toast.success(editTarget ? 'Session updated.' : 'Session saved.');
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
      await apiFetch(`/api/processrecordings/${deleteTarget.recordingId}`, { method: 'DELETE' });
      toast.success('Session deleted.');
      setDeleteTarget(null);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Table columns ---
  const columns: Column<ProcessRecording>[] = [
    {
      key: 'sessionDate',
      header: 'Date',
      sortable: true,
      render: (row) =>
        row.sessionDate
          ? new Date(row.sessionDate).toLocaleDateString()
          : '—',
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
      key: 'sessionType',
      header: 'Session Type',
      render: (row) => row.sessionType ?? '—',
    },
    {
      key: 'sessionDurationMinutes',
      header: 'Duration',
      render: (row) =>
        row.sessionDurationMinutes != null ? `${row.sessionDurationMinutes} min` : '—',
    },
    {
      key: 'emotionalStateObserved',
      header: 'Emotional State',
      render: (row) => {
        const start = row.emotionalStateObserved ?? '—';
        const end = row.emotionalStateEnd ?? '—';
        return `${start} → ${end}`;
      },
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.progressNoted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              ✓ Progress
            </span>
          )}
          {row.concernsFlagged && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              ⚠ Concern
            </span>
          )}
          {row.referralMade && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              ↗ Referral
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
            className="px-3 py-1 text-xs rounded-md border border-teal-600 text-teal-600 hover:bg-teal-50 font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            className="px-3 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const narrativeLength = form.sessionNarrative?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Process Recordings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Counseling session records</p>
        </div>
        <button
          onClick={openCreate}
          className="self-start sm:self-auto px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add Session
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filterResidentId}
          onChange={(e) => handleResidentFilterChange(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Residents</option>
          {residents.map((r) => (
            <option key={r.residentId} value={String(r.residentId)}>
              {residentLabel(r)}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by social worker…"
          value={socialWorkerInput}
          onChange={(e) => handleSocialWorkerInputChange(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} onRetry={refresh} />
      ) : recordings.length === 0 ? (
        <EmptyState
          Icon={ClipboardList}
          title="No sessions found"
          message="Adjust your filters or add a new session to get started."
          action={
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
            >
              Add Session
            </button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={recordings}
            rowKey={(r) => r.recordingId}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Session' : 'New Session'}
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select resident…</option>
              {residents.map((r) => (
                <option key={r.residentId} value={r.residentId}>
                  {residentLabel(r)}
                </option>
              ))}
            </select>
          </div>

          {/* Session Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.sessionDate?.slice(0, 10) ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value || null }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
            <select
              value={form.sessionType ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value || null }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select type…</option>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={form.sessionDurationMinutes ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sessionDurationMinutes: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Emotional states */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotional State (Start)
              </label>
              <select
                value={form.emotionalStateObserved ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emotionalStateObserved: e.target.value || null }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select…</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotional State (End)
              </label>
              <select
                value={form.emotionalStateEnd ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emotionalStateEnd: e.target.value || null }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select…</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Narrative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Narrative <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={form.sessionNarrative ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, sessionNarrative: e.target.value || null }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
            <p className={`text-xs mt-1 ${narrativeLength < 20 ? 'text-red-500' : 'text-gray-400'}`}>
              {narrativeLength} / 20 characters minimum
            </p>
          </div>

          {/* Interventions Applied */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interventions Applied
            </label>
            <textarea
              rows={3}
              value={form.interventionsApplied ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, interventionsApplied: e.target.value || null }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
          </div>

          {/* Follow-Up Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Follow-Up Actions
            </label>
            <textarea
              rows={3}
              value={form.followUpActions ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, followUpActions: e.target.value || null }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.progressNoted}
                onChange={(e) => setForm((f) => ({ ...f, progressNoted: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Progress Noted
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.concernsFlagged}
                onChange={(e) => setForm((f) => ({ ...f, concernsFlagged: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Concerns Flagged
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.referralMade}
                onChange={(e) => setForm((f) => ({ ...f, referralMade: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Referral Made
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              )}
              {editTarget ? 'Save Changes' : 'Create Session'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        itemLabel={
          deleteTarget
            ? `Session on ${
                deleteTarget.sessionDate
                  ? new Date(deleteTarget.sessionDate).toLocaleDateString()
                  : 'unknown date'
              } with resident #${deleteTarget.residentId ?? '?'}`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
