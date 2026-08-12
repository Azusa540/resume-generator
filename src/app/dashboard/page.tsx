'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';

export default function DashboardPage() {
  const router = useRouter();
  const { username, ready } = useSession();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetch('/api/auth/api-key')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setHasApiKey(d.hasApiKey); });
  }, [ready]);

  async function handleGenerateApiKey() {
    const msg = hasApiKey
      ? 'Generate a new API key? Your current key will stop working.'
      : 'Generate an API key for external resume generation?';
    if (!confirm(msg)) return;
    setGenerating(true);
    const res = await fetch('/api/auth/api-key', { method: 'POST' });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      setGeneratedKey(data.apiKey);
      setHasApiKey(true);
    } else {
      alert(data.message || 'Failed to generate API key.');
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Welcome back, {username}!
        </h1>
        <p className="text-gray-500 text-sm mb-10">Manage your resumes and profiles from here.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <DashCard
            icon="👤"
            title="Profiles"
            desc="Create and manage your resume profiles."
            action="Go to Profiles"
            onClick={() => router.push('/profiles')}
          />
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-1">API Key</h2>
          <p className="text-sm text-gray-500 mb-4">
            Use this key in the <code className="text-xs bg-gray-100 px-1 rounded">X-API-Key</code> header when calling{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">POST /api/resume/generate-from-link</code>.
          </p>
          <div className="flex items-center gap-3">
            {hasApiKey ? (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">Active key configured</span>
            ) : (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">No key yet</span>
            )}
            <button
              onClick={handleGenerateApiKey}
              disabled={generating}
              className="text-sm font-medium text-blue-600 border border-blue-200 hover:border-blue-400 rounded-lg py-1.5 px-3 disabled:opacity-50"
            >
              {generating ? 'Generating…' : hasApiKey ? 'Regenerate API Key' : 'Generate API Key'}
            </button>
          </div>
        </section>

        {generatedKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Your API Key</h3>
              <p className="text-sm text-gray-600">Copy this key now — it will not be shown again.</p>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-gray-800">
                {generatedKey}
              </code>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
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
