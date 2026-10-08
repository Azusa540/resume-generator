'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';
import PizZip from 'pizzip';

const MAX_ITEMS = 20;

interface Profile {
  _id: string;
  fullName: string;
  profileType?: 'software' | 'other';
}

interface Bid {
  company: string;
  jobLink?: string;
  profileId?: { _id: string; fullName: string } | string | null;
  createdAt: string;
}

interface DetailRow {
  id: string;
  company: string;
  title: string;
  description: string;
}

type ItemRequest =
  | { jobLink: string }
  | { title: string; company: string; jobDescription: string };

interface ResultItem {
  id: string;
  label: string;
  status: 'waiting' | 'running' | 'ready' | 'failed';
  error?: string;
  company?: string;
  jobTitle?: string;
  fileName?: string;
  pdfBase64?: string;
  request?: ItemRequest;
}

function emptyDetail(): DetailRow {
  return { id: crypto.randomUUID(), company: '', title: '', description: '' };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pdfBlob(b64: string): Blob {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'application/pdf' });
}

function normalizeLink(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/$/, '') || '/';
    return `${url.host}${path}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/\/$/, '');
  }
}

export default function BulkResumePage() {
  const { ready } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState('');
  const [mode, setMode] = useState<'links' | 'details'>('links');
  const [linksText, setLinksText] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([emptyDetail()]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!ready) return;
    fetch('/api/profiles')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Profile[]) => {
        setProfiles(data);
        if (data.length === 0) return;
        const saved = localStorage.getItem('last_profile_id');
        const match = saved && data.find((p) => p._id === saved);
        setProfileId(match ? saved! : data[0]._id);
      });
    fetch('/api/bid-details')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Bid[]) => setBids(data))
      .catch(() => { /* duplicate warning is optional */ });
  }, [ready]);

  const linkCount = useMemo(
    () => linksText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).length,
    [linksText]
  );

  function bidsToday(): Bid[] {
    if (!profileId) return [];
    const today = new Date().toDateString();
    return bids.filter((b) => {
      const bidProfileId = typeof b.profileId === 'object' && b.profileId ? b.profileId._id : b.profileId;
      return bidProfileId === profileId && new Date(b.createdAt).toDateString() === today;
    });
  }

  function companyHasBidToday(company: string): boolean {
    const name = company.trim().toLowerCase();
    if (!name) return false;
    return bidsToday().some((b) => b.company.trim().toLowerCase() === name);
  }

  const duplicateLinks = useMemo(() => {
    const today = new Date().toDateString();
    const links = linksText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return links.filter((link) => bids.some((b) => {
      const bidProfileId = typeof b.profileId === 'object' && b.profileId ? b.profileId._id : b.profileId;
      return (
        bidProfileId === profileId &&
        new Date(b.createdAt).toDateString() === today &&
        !!b.jobLink &&
        normalizeLink(b.jobLink) === normalizeLink(link)
      );
    }));
  }, [bids, linksText, profileId]);

  function buildQueue(): ResultItem[] {
    if (mode === 'links') {
      return linksText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_ITEMS)
        .map((jobLink) => ({
          id: crypto.randomUUID(),
          label: jobLink,
          status: 'waiting' as const,
          request: { jobLink },
        }));
    }
    return details
      .filter((row) => row.company.trim() || row.title.trim() || row.description.trim())
      .slice(0, MAX_ITEMS)
      .map((row) => {
        const company = row.company.trim();
        const title = row.title.trim();
        const description = row.description.trim();
        const complete = company && title && description;
        return {
          id: crypto.randomUUID(),
          label: [company, title].filter(Boolean).join(' · ') || 'Untitled job',
          status: complete ? 'waiting' as const : 'failed' as const,
          error: complete ? undefined : 'Company, job title, and job description are required.',
          company,
          jobTitle: title,
          request: complete
            ? { title, company, jobDescription: description }
            : undefined,
        };
      });
  }

  async function runOne(item: ResultItem, selectedProfileId: string) {
    if (!item.request) return;
    setResults((rows) => rows.map((row) => (
      row.id === item.id ? { ...row, status: 'running', error: undefined } : row
    )));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 240_000);
    try {
      const res = await fetch('/api/resume/bulk-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfileId, ...item.request }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Generation failed.');

      setResults((rows) => rows.map((row) => (
        row.id === item.id
          ? {
              ...row,
              status: 'ready',
              label: `${data.company} · ${data.jobTitle}`,
              company: data.company,
              jobTitle: data.jobTitle,
              fileName: data.fileName,
              pdfBase64: data.pdfBase64,
              error: undefined,
            }
          : row
      )));

      fetch('/api/bid-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId,
          jobTitle: data.jobTitle,
          company: data.company,
          jobLink: 'jobLink' in item.request ? item.request.jobLink : '',
          jobDescription: 'jobDescription' in item.request ? item.request.jobDescription : '',
        }),
      }).catch(() => { /* bid tracking is best-effort */ });
    } catch (err) {
      const message = (err as Error)?.name === 'AbortError'
        ? 'This resume took too long and timed out. Try it again.'
        : (err as Error)?.message || 'Generation failed.';
      setResults((rows) => rows.map((row) => (
        row.id === item.id ? { ...row, status: 'failed', error: message } : row
      )));
    } finally {
      clearTimeout(timer);
    }
  }

  async function generateAll() {
    setFormError('');
    if (!profileId) {
      setFormError('Select a profile.');
      return;
    }
    const queue = buildQueue();
    if (queue.length === 0) {
      setFormError(mode === 'links' ? 'Paste at least one job link.' : 'Add at least one job.');
      return;
    }
    const sourceCount = mode === 'links' ? linkCount : details.filter((r) => r.company || r.title || r.description).length;
    if (sourceCount > MAX_ITEMS) {
      setFormError(`Only the first ${MAX_ITEMS} jobs will be generated.`);
    }
    setResults(queue);
    setRunning(true);
    try {
      for (const item of queue) {
        if (item.status === 'failed') continue;
        await runOne(item, profileId);
      }
    } finally {
      setRunning(false);
    }
  }

  async function retry(item: ResultItem) {
    if (running || !item.request) return;
    setRunning(true);
    try {
      await runOne(item, profileId);
    } finally {
      setRunning(false);
    }
  }

  function downloadOne(item: ResultItem) {
    if (!item.pdfBase64 || !item.fileName) return;
    downloadBlob(`${item.fileName}.pdf`, pdfBlob(item.pdfBase64));
  }

  function downloadAll() {
    const ready = results.filter((item) => item.status === 'ready' && item.pdfBase64 && item.fileName);
    if (ready.length === 0) return;
    const zip = new PizZip();
    const used = new Set<string>();
    for (const item of ready) {
      let name = item.fileName!;
      let n = 2;
      while (used.has(name)) name = `${item.fileName}_${n++}`;
      used.add(name);
      zip.file(`${name}.pdf`, item.pdfBase64!, { base64: true });
    }
    downloadBlob('resumes.zip', zip.generate({ type: 'blob' }) as Blob);
  }

  function pasteDetails(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t')) return;
    e.preventDefault();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.split('\t'))
      .filter((cols) => cols.some((col) => col.trim()))
      .slice(0, MAX_ITEMS)
      .map((cols) => ({
        id: crypto.randomUUID(),
        company: (cols[0] ?? '').trim(),
        title: (cols[1] ?? '').trim(),
        description: (cols[2] ?? '').trim(),
      }));
    if (rows.length > 0) setDetails(rows);
  }

  const readyCount = results.filter((item) => item.status === 'ready').length;

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Bulk resumes</h1>
          <Link href="/resume-generator" className="text-sm text-blue-600 hover:underline">Single resume</Link>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          One profile, many jobs. Resumes are generated one at a time. Download each file, or all of them as a zip.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile <span className="text-red-400">*</span>
            </label>
            {profiles.length === 0 ? (
              <p className="text-sm text-gray-400">No profiles found. <a href="/new-profile" className="text-blue-500 hover:underline">Create one first.</a></p>
            ) : (
              <select
                value={profileId}
                onChange={(e) => {
                  setProfileId(e.target.value);
                  localStorage.setItem('last_profile_id', e.target.value);
                }}
                disabled={running}
                className={selectCls}
              >
                {profiles.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} — {p.profileType === 'other' ? 'Non-Software' : 'Software'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Input</span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(['links', 'details'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={running}
                  onClick={() => setMode(value)}
                  className={`px-3 py-1.5 text-sm rounded-md ${mode === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {value === 'links' ? 'Job links' : 'Job details'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'links' ? (
            <div>
              <textarea
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                disabled={running}
                rows={6}
                placeholder={'https://example.com/jobs/1\nhttps://example.com/jobs/2'}
                className={`${inputCls} resize-y`}
              />
              <p className="mt-1.5 text-sm text-gray-500">{linkCount} link{linkCount === 1 ? '' : 's'}</p>
              {duplicateLinks.map((link) => (
                <p key={link} className="mt-1 text-sm text-red-600 break-all">
                  Already generated today: {link}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-3" onPaste={pasteDetails}>
              {details.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-100 rounded-xl p-3">
                  <div>
                    <input
                      value={row.company}
                      onChange={(e) => setDetails((rows) => rows.map((r) => r.id === row.id ? { ...r, company: e.target.value } : r))}
                      disabled={running}
                      placeholder="Company"
                      className={inputCls}
                    />
                    {companyHasBidToday(row.company) && (
                      <p className="mt-1 text-sm text-red-600">
                        Already generated for {row.company} today.
                      </p>
                    )}
                  </div>
                  <input
                    value={row.title}
                    onChange={(e) => setDetails((rows) => rows.map((r) => r.id === row.id ? { ...r, title: e.target.value } : r))}
                    disabled={running}
                    placeholder="Job title"
                    className={inputCls}
                  />
                  <textarea
                    value={row.description}
                    onChange={(e) => setDetails((rows) => rows.map((r) => r.id === row.id ? { ...r, description: e.target.value } : r))}
                    disabled={running}
                    rows={3}
                    placeholder="Job description"
                    className={`${inputCls} sm:col-span-2 resize-y`}
                  />
                  {details.length > 1 && (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => setDetails((rows) => rows.filter((r) => r.id !== row.id))}
                      className="text-sm text-gray-500 hover:text-red-600 text-left"
                    >
                      Remove job {index + 1}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                disabled={running}
                onClick={() => setDetails((rows) => [...rows, emptyDetail()])}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add job
              </button>
              <p className="text-xs text-gray-400">Paste a spreadsheet copied as company, title, and description columns.</p>
            </div>
          )}

          {formError && <p className="text-red-500 text-sm">{formError}</p>}

          <button
            type="button"
            onClick={generateAll}
            disabled={running || profiles.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm"
          >
            {running ? 'Generating…' : 'Generate all resumes'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-medium text-gray-900">Results</h2>
              <p className="text-sm text-gray-500">{readyCount} of {results.length} ready</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {results.map((item) => (
                <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 break-words">{item.label}</p>
                    <p className={`text-xs mt-0.5 ${item.status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.status === 'waiting' && 'Waiting'}
                      {item.status === 'running' && 'Generating…'}
                      {item.status === 'ready' && 'Ready'}
                      {item.status === 'failed' && (item.error || 'Failed')}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {item.status === 'ready' && (
                      <button type="button" onClick={() => downloadOne(item)} className="text-sm text-blue-600 hover:underline">
                        Download
                      </button>
                    )}
                    {item.status === 'failed' && item.request && (
                      <button type="button" disabled={running} onClick={() => retry(item)} className="text-sm text-blue-600 hover:underline disabled:opacity-50">
                        Retry
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={downloadAll}
              disabled={readyCount === 0}
              className="mt-4 w-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-medium py-2.5 rounded-lg text-sm"
            >
              Download all (zip)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
