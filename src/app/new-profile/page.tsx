'use client';

import Nav from '@/components/Nav';
import ProfileForm from '@/components/ProfileForm';
import { useSession } from '@/hooks/useSession';

export default function NewProfilePage() {
  const { ready } = useSession();
  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Profile</h1>
        <ProfileForm />
      </div>
    </div>
  );
}
