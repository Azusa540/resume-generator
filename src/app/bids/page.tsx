'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';

interface Bid {
  _id: string;
  jobTitle: string;
  company: string;
  jobLink?: string;
  profileId?: { _id: string; fullName: string } | string | null;
  createdAt: string;
}

function profileName(profileId: Bid['profileId']): string {
  if (profileId && typeof profileId === 'object') return profileId.fullName;
  return '—';
}

export default function BidsPage() {
  const { ready } = useSession();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    fetch('/api/bid-details')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBids(data); })
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Bids</h1>
          <span className="text-sm text-gray-400">{bids.length} saved</span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : bids.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="text-sm">No bids yet. They&apos;re saved when you download a generated resume.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Profile</th>
                  <th className="px-4 py-3 font-medium">Job Link</th>
                  <th className="px-4 py-3 font-medium">Saved</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b._id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-700">{b.company}</td>
                    <td className="px-4 py-3 text-gray-500">{profileName(b.profileId)}</td>
                    <td className="px-4 py-3">
                      {b.jobLink ? (
                        <a
                          href={b.jobLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open ↗
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
