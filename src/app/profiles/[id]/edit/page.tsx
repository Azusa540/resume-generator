'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Nav from '@/components/Nav';
import ProfileForm, { ProfileFormData } from '@/components/ProfileForm';
import { useSession } from '@/hooks/useSession';

export default function EditProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { ready } = useSession();
  const [initial, setInitial] = useState<ProfileFormData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetch('/api/profiles')
      .then((r) => r.ok ? r.json() : null)
      .then((profiles: (ProfileFormData & { _id: string })[] | null) => {
        if (!profiles) return;
        const profile = profiles.find((p) => p._id === id);
        if (!profile) { setNotFound(true); return; }
        setInitial(profile);
      });
  }, [id, ready, router]);

  if (!ready) return null;

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-8 text-gray-500 text-sm">Profile not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Profile</h1>
        {initial ? (
          <ProfileForm initial={initial} profileId={id} />
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </div>
    </div>
  );
}
