import { useCallback, useEffect, useState } from 'react';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import DeleteConfirmDialog from '../../components/shared/DeleteConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch } from '../../utils/api';

interface UserRecord {
  id: string;
  email: string;
  userName: string;
  emailConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnd: string | null;
  roles: string[];
}

export default function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<UserRecord | null>(null);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ email: '', userName: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<UserRecord[]>('/api/users');
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { document.title = 'User Management — Hope Haven'; }, []);
  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function toggleRole(user: UserRecord, role: string) {
    setUpdatingId(user.id);
    const hasRole = user.roles.includes(role);
    const newRoles = hasRole
      ? user.roles.filter(r => r !== role)
      : [...user.roles, role];

    try {
      const updated = await apiFetch<{ roles: string[] }>(`/api/users/${user.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles: newRoles }),
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roles: updated.roles } : u));
      toast.success('Roles updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  }

  function openEdit(user: UserRecord) {
    setEditTarget(user);
    setForm({ email: user.email ?? '', userName: user.userName ?? '' });
    setFormError('');
  }

  function closeEdit() {
    setEditTarget(null);
    setFormError('');
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setFormLoading(true);
    setFormError('');
    try {
      const updated = await apiFetch<UserRecord>(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: form.email.trim(),
          userName: form.userName.trim(),
        }),
      });
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      toast.success('User updated.');
      closeEdit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setFormLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch<unknown>(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast.success('User deleted.');
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" label="Loading users…" />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage registered users and their role assignments.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Email Confirmed</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">MFA</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Admin</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Donor</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">{user.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${user.emailConfirmed ? 'bg-green-400' : 'bg-gray-300'}`} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${user.twoFactorEnabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => void toggleRole(user, 'Admin')}
                    disabled={updatingId === user.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      user.roles.includes('Admin')
                        ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={user.roles.includes('Admin') ? 'Remove Admin role' : 'Grant Admin role'}
                  >
                    {updatingId === user.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : user.roles.includes('Admin') ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <Shield size={12} />
                    )}
                    {user.roles.includes('Admin') ? 'Admin' : 'Grant'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => void toggleRole(user, 'Donor')}
                    disabled={updatingId === user.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      user.roles.includes('Donor')
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={user.roles.includes('Donor') ? 'Remove Donor role' : 'Grant Donor role'}
                  >
                    {updatingId === user.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Shield size={12} />
                    )}
                    {user.roles.includes('Donor') ? 'Donor' : 'Grant'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      onClick={() => setViewTarget(user)}
                      className="w-full sm:w-auto px-2.5 py-2 text-xs rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(user)}
                      className="w-full sm:w-auto px-2.5 py-2 text-xs rounded border border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="w-full sm:w-auto px-2.5 py-2 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {users.length === 0 && !loading && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">No registered users found.</div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {users.length} registered user{users.length !== 1 ? 's' : ''}
      </p>

      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="User Details"
        size="md"
      >
        {viewTarget && (
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-medium text-gray-800">Email:</span> {viewTarget.email || '—'}</p>
            <p><span className="font-medium text-gray-800">Username:</span> {viewTarget.userName || '—'}</p>
            <p><span className="font-medium text-gray-800">Roles:</span> {viewTarget.roles.join(', ') || '—'}</p>
            <p><span className="font-medium text-gray-800">Email confirmed:</span> {viewTarget.emailConfirmed ? 'Yes' : 'No'}</p>
            <p><span className="font-medium text-gray-800">MFA enabled:</span> {viewTarget.twoFactorEnabled ? 'Yes' : 'No'}</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={closeEdit}
        title="Edit User"
        size="md"
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={form.userName}
              onChange={(e) => setForm((prev) => ({ ...prev, userName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEdit}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              disabled={formLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-60"
              disabled={formLoading}
            >
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        itemLabel={deleteTarget?.email ?? 'this user'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteLoading}
      />
    </div>
  );
}
