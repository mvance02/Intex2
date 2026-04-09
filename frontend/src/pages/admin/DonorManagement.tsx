import { useCallback, useEffect, useState } from 'react';
import { HandHeart } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useSupporters } from '../../hooks/useSupporters';
import DataTable, { type Column } from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import FilterBar from '../../components/shared/FilterBar';
import Modal from '../../components/shared/Modal';
import DeleteConfirmDialog from '../../components/shared/DeleteConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import EmptyState from '../../components/shared/EmptyState';
import { apiFetch } from '../../utils/api';
import type { Supporter, Donation, PaginatedResponse } from '../../types/models';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Lapsed', value: 'Lapsed' },
];

const TYPE_OPTIONS = [
  { label: 'Individual', value: 'Individual' },
  { label: 'Organization', value: 'Organization' },
  { label: 'Church', value: 'Church' },
  { label: 'Corporate', value: 'Corporate' },
];

const FILTER_GROUPS = [
  { key: 'status', label: 'Status', options: STATUS_OPTIONS },
  { key: 'supporterType', label: 'Type', options: TYPE_OPTIONS },
];

const EMPTY_FORM = {
  displayName: '',
  supporterType: '',
  firstName: '',
  lastName: '',
  organizationName: '',
  email: '',
  phone: '',
  country: '',
  region: '',
  status: 'Active',
  acquisitionChannel: '',
  relationshipType: '',
} as const;

type FormField = keyof typeof EMPTY_FORM;
type FormState = Record<FormField, string>;

function statusBadge(status: string | null) {
  const color =
    status === 'Active'
      ? 'bg-teal-100 text-teal-700'
      : status === 'Lapsed'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] ${color}`}>
      {status ?? '—'}
    </span>
  );
}

function formatAmount(donation: Donation): string {
  if (donation.amount == null) return '—';
  return `${donation.currencyCode ?? ''} ${donation.amount.toLocaleString()}`.trim();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DonorManagement() {
  const toast = useToast();

  useEffect(() => {
    document.title = 'Donors — Hope Haven';
  }, []);

  // List state
  const { supporters, totalPages, loading, error, page, setPage, setSearch, filters, setFilters, refresh } = useSupporters();

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supporter | null>(null);
  const [formState, setFormState] = useState<FormState>({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail modal state
  const [viewTarget, setViewTarget] = useState<Supporter | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Supporter | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (supporter: Supporter) => {
    setEditTarget(supporter);
    setFormState({
      displayName: supporter.displayName ?? '',
      supporterType: supporter.supporterType ?? '',
      firstName: supporter.firstName ?? '',
      lastName: supporter.lastName ?? '',
      organizationName: supporter.organizationName ?? '',
      email: supporter.email ?? '',
      phone: supporter.phone ?? '',
      country: supporter.country ?? '',
      region: supporter.region ?? '',
      status: supporter.status ?? 'Active',
      acquisitionChannel: supporter.acquisitionChannel ?? '',
      relationshipType: supporter.relationshipType ?? '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormError(null);
  };

  const handleFormField = (field: FormField, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/supporters/${editTarget.supporterId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...editTarget, ...formState }),
        });
      } else {
        await apiFetch('/api/supporters', {
          method: 'POST',
          body: JSON.stringify(formState),
        });
      }
      toast.success(editTarget ? 'Supporter updated.' : 'Supporter created.');
      closeForm();
      void refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const openView = async (supporter: Supporter) => {
    setViewTarget(supporter);
    setDonations([]);
    setDonationsError(null);
    setDonationsLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<Donation>>(
        `/api/donations?supporterId=${supporter.supporterId}&page=1&pageSize=50`
      );
      setDonations(data.items);
    } catch (err) {
      setDonationsError(err instanceof Error ? err.message : 'Failed to load donations.');
    } finally {
      setDonationsLoading(false);
    }
  };

  const closeView = () => {
    setViewTarget(null);
    setDonations([]);
  };

  const openDelete = (supporter: Supporter) => setDeleteTarget(supporter);
  const closeDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/supporters/${deleteTarget.supporterId}`, { method: 'DELETE' });
      toast.success('Supporter deleted.');
      closeDelete();
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Supporter>[] = [
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      render: (row) => <span className="font-medium text-gray-800">{row.displayName ?? '—'}</span>,
    },
    {
      key: 'supporterType',
      header: 'Type',
      render: (row) => row.supporterType ?? '—',
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) =>
        row.email ? (
          <a
            href={`mailto:${row.email}`}
            className="text-teal-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.email}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (row) => row.country ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-44',
      render: (row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => void openView(row)}
            className="px-2 py-1 text-xs border border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            View
          </button>
          <button
            onClick={() => openEdit(row)}
            className="px-2 py-1 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => openDelete(row)}
            className="px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const donationColumns: Column<Donation>[] = [
    {
      key: 'donationDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.donationDate),
    },
    {
      key: 'donationType',
      header: 'Type',
      render: (row) => row.donationType ?? '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => formatAmount(row),
    },
    {
      key: 'campaignName',
      header: 'Campaign',
      render: (row) => row.campaignName ?? '—',
    },
    {
      key: 'isRecurring',
      header: 'Recurring',
      render: (row) =>
        row.isRecurring ? (
          <span className="text-teal-600 font-medium text-xs">Yes</span>
        ) : (
          <span className="text-gray-400 text-xs">No</span>
        ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage supporters and their donation history.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold uppercase tracking-[0.08em] hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          + Add Supporter
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by name or email…"
        onSearch={handleSearch}
        filters={FILTER_GROUPS}
        onFilterChange={handleFilterChange}
        filterValues={filters}
      />

      {/* Content */}
      {error && <ErrorAlert message={error} onRetry={() => void refresh()} />}

      {loading ? (
        <LoadingSpinner label="Loading supporters…" />
      ) : supporters.length === 0 && !error ? (
        <EmptyState
          Icon={HandHeart}
          title="No supporters found"
          message="Try adjusting your search or filters, or add a new supporter."
          action={
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold uppercase tracking-[0.08em] hover:bg-teal-700"
            >
              Add Supporter
            </button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={supporters}
            rowKey={(row) => row.supporterId}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editTarget ? 'Edit Supporter' : 'Add Supporter'}
        size="xl"
      >
        <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formState.displayName}
                onChange={(e) => handleFormField('displayName', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supporter Type</label>
              <select
                value={formState.supporterType}
                onChange={(e) => handleFormField('supporterType', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">— Select —</option>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formState.status}
                onChange={(e) => handleFormField('status', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formState.firstName}
                onChange={(e) => handleFormField('firstName', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formState.lastName}
                onChange={(e) => handleFormField('lastName', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={formState.organizationName}
                onChange={(e) => handleFormField('organizationName', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => handleFormField('email', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formState.phone}
                onChange={(e) => handleFormField('phone', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={formState.country}
                onChange={(e) => handleFormField('country', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={formState.region}
                onChange={(e) => handleFormField('region', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Channel</label>
              <input
                type="text"
                value={formState.acquisitionChannel}
                onChange={(e) => handleFormField('acquisitionChannel', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={formLoading}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2"
            >
              {formLoading && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
              )}
              {editTarget ? 'Save Changes' : 'Create Supporter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail / View Modal */}
      <Modal
        isOpen={viewTarget !== null}
        onClose={closeView}
        title="Supporter Details"
        size="xl"
      >
        {viewTarget && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Display Name</p>
                <p className="text-gray-800 font-medium mt-0.5">{viewTarget.displayName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.supporterType ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</p>
                <div className="mt-0.5">{statusBadge(viewTarget.status)}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Country</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.country ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Region</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.region ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">First Donation</p>
                <p className="text-gray-800 mt-0.5">{formatDate(viewTarget.firstDonationDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acquisition Channel</p>
                <p className="text-gray-800 mt-0.5">{viewTarget.acquisitionChannel ?? '—'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Donation History</h3>
              {donationsError && <ErrorAlert message={donationsError} />}
              {donationsLoading ? (
                <LoadingSpinner size="sm" label="Loading donations…" />
              ) : donations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No donations on record.</p>
              ) : (
                <DataTable
                  columns={donationColumns}
                  data={donations}
                  rowKey={(row) => row.donationId}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        itemLabel={deleteTarget?.displayName ?? 'this supporter'}
        onConfirm={() => void handleDelete()}
        onCancel={closeDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
