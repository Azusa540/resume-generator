'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';

interface Profile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  employment: { companyName: string; position?: string; from?: string; to?: string }[];
  education: { university: string; degree: string }[];
}

export default function ProfilesPage() {
  const router = useRouter();
  const { ready } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetch('/api/profiles')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setProfiles(data); })
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this profile?')) return;
    setDeletingId(id);
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    setProfiles((prev) => prev.filter((p) => p._id !== id));
    setDeletingId(null);
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Profiles</h1>
          <button
            onClick={() => router.push('/new-profile')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Profile
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-sm">No profiles yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <ProfileCard
                key={p._id}
                profile={p}
                deleting={deletingId === p._id}
                onEdit={() => router.push(`/profiles/${p._id}/edit`)}
                onDelete={() => handleDelete(p._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ profile, deleting, onEdit, onDelete }: {
  profile: Profile;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-gray-900 text-base">{profile.fullName}</h2>
        <p className="text-sm text-gray-500">{profile.email}</p>
        {profile.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
        {profile.address && <p className="text-xs text-gray-400 mt-0.5">{profile.address}</p>}
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span>{profile.education.length} education</span>
        <span>·</span>
        <span>{profile.employment.length} employment</span>
      </div>

      {profile.employment.length > 0 && (
        <p className="text-xs text-gray-500 truncate">
          {profile.employment[0].position
            ? `${profile.employment[0].position} @ ${profile.employment[0].companyName}`
            : profile.employment[0].companyName}
        </p>
      )}

      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="flex-1 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg py-1.5 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 text-sm font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg py-1.5 transition-colors disabled:opacity-50"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
