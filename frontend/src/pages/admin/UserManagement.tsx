import { useCallback, useEffect, useState } from 'react';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const API = import.meta.env.VITE_API_URL ?? '';

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
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/users`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}`);
      setUsers(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function toggleRole(user: UserRecord, role: string) {
    setUpdatingId(user.id);
    const hasRole = user.roles.includes(role);
    const newRoles = hasRole
      ? user.roles.filter(r => r !== role)
      : [...user.roles, role];

    try {
      const res = await fetch(`${API}/api/users/${user.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles: newRoles }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || `${res.status}`);
      }
      const updated = await res.json() as { roles: string[] };
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roles: updated.roles } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setUpdatingId(null);
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
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Email Confirmed</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">MFA</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Admin</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Donor</th>
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
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">No registered users found.</div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {users.length} registered user{users.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
