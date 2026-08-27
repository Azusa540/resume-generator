'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { getSession } from '@/lib/session';

interface UserRow {
  _id: string;
  username: string;
  is_admin: boolean;
  is_premium: boolean;
  createdAt: string;
  hasApiKey?: boolean;
  hasAnthropicKey?: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newIsPremium, setNewIsPremium] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editAnthropicKey, setEditAnthropicKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditAnthropicKey, setShowEditAnthropicKey] = useState(false);

  // API key modal
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session?.isAdmin) { router.push('/dashboard'); return; }
    fetchUsers();
  }, [router]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    else setError('Failed to load users.');
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true); setCreateError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, is_admin: newIsAdmin, is_premium: newIsPremium }),
    });
    if (res.ok) {
      setNewUsername(''); setNewPassword(''); setNewIsAdmin(false); setNewIsPremium(false);
      fetchUsers();
    } else {
      const d = await res.json();
      setCreateError(d.message || 'Failed to create user.');
    }
    setCreating(false);
  }

  function startEdit(u: UserRow) {
    setEditId(u._id); setEditPassword(''); setEditIsAdmin(u.is_admin); setEditIsPremium(u.is_premium); setEditAnthropicKey('');
  }

  async function handleSave(id: string) {
    setSaving(true);
    const body: Record<string, unknown> = { id, is_admin: editIsAdmin, is_premium: editIsPremium };
    if (editPassword) body.password = editPassword;
    if (editAnthropicKey) body.anthropicApiKey = editAnthropicKey;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) { setEditId(null); fetchUsers(); }
    setSaving(false);
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchUsers();
  }

  async function handleGenerateApiKey(userId: string, username: string) {
    if (!confirm(`Generate a new API key for "${username}"? Any existing key will stop working.`)) return;
    setGeneratingFor(userId);
    const res = await fetch('/api/admin/users/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    setGeneratingFor(null);
    if (res.ok) {
      setGeneratedKey(data.apiKey);
      fetchUsers();
    } else {
      alert(data.message || 'Failed to generate API key.');
    }
  }

  async function copyApiKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-xl font-semibold text-gray-900">User Management</h1>

        {/* ── Create User ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Create User</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text" required placeholder="Username" value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)} className={inputCls}
            />
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'} required placeholder="Password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowNewPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showNewPassword
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox" checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox" checked={newIsPremium}
                  onChange={(e) => setNewIsPremium(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                Premium
              </label>
              <button
                type="submit" disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
          {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        </section>

        {/* ── User List ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">All Users</h2>
          </div>
          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Username</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Premium</th>
                  <th className="px-6 py-3 text-left">API Key</th>
                  <th className="px-6 py-3 text-left">Claude Key</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    {editId === u._id ? (
                      <>
                        <td className="px-6 py-3 font-medium text-gray-900">{u.username}</td>
                        <td className="px-6 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox" checked={editIsAdmin}
                              onChange={(e) => setEditIsAdmin(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-xs text-gray-600">Admin</span>
                          </label>
                        </td>
                        <td className="px-6 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox" checked={editIsPremium}
                              onChange={(e) => setEditIsPremium(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-xs text-gray-600">Premium</span>
                          </label>
                        </td>
                        <td className="px-6 py-3 text-gray-500">—</td>
                        <td className="px-6 py-3">
                          <div className="relative w-52">
                            <input
                              type={showEditAnthropicKey ? 'text' : 'password'} placeholder="New Claude API key (optional)"
                              value={editAnthropicKey} onChange={(e) => setEditAnthropicKey(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="button" onClick={() => setShowEditAnthropicKey((v) => !v)}
                              className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                              {showEditAnthropicKey
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              }
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="relative w-52">
                            <input
                              type={showEditPassword ? 'text' : 'password'} placeholder="New password (optional)"
                              value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="button" onClick={() => setShowEditPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                              {showEditPassword
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              }
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleSave(u._id)} disabled={saving}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-700">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-3 font-medium text-gray-900">{u.username}</td>
                        <td className="px-6 py-3">
                          {u.is_admin ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Admin</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">User</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {u.is_premium ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Premium</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {u.hasApiKey ? (
                              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                            ) : (
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">None</span>
                            )}
                            <button
                              onClick={() => handleGenerateApiKey(u._id, u.username)}
                              disabled={generatingFor === u._id}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                            >
                              {generatingFor === u._id ? 'Generating…' : u.hasApiKey ? 'Regenerate' : 'Generate'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {u.hasAnthropicKey ? (
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                          ) : (
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">None</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-right space-x-3">
                          <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800 font-medium">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(u._id, u.username)} className="text-red-500 hover:text-red-700 font-medium">
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {generatedKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">API Key Generated</h3>
              <p className="text-sm text-gray-600">
                Copy this key now. It will not be shown again. Send it as{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">X-API-Key</code> on{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">POST /api/resume/generate-from-link</code>.
              </p>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-gray-800">
                {generatedKey}
              </code>
              <div className="flex justify-end gap-2">
                <button
                  onClick={copyApiKey}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  Copy
                </button>
                <button
                  onClick={() => setGeneratedKey(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
