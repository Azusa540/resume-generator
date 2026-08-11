'use client';

import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';

export default function DashboardPage() {
  const router = useRouter();
  const { username, ready } = useSession();

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Welcome back, {username}!
        </h1>
        <p className="text-gray-500 text-sm mb-10">Manage your resumes and profiles from here.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashCard
            icon="👤"
            title="Profiles"
            desc="Create and manage your resume profiles."
            action="Go to Profiles"
            onClick={() => router.push('/profiles')}
          />
        </div>
      </div>
    </div>
  );
}

function DashCard({
  icon,
  title,
  desc,
  action,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
      <span className="text-3xl">{icon}</span>
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onClick}
        className="mt-auto text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg py-1.5 px-3 transition-colors self-start"
      >
        {action} →
      </button>
    </div>
  );
}
