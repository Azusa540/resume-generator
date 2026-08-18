'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { useSession } from '@/hooks/useSession';
import type { ResumeReviewData, GeneratedResume } from '@/types/resume';

function isCompleteGenerated(g: unknown): g is GeneratedResume {
  if (!g || typeof g !== 'object') return false;
  const r = g as Record<string, unknown>;
  return (
    typeof r.target_job_title === 'string' && r.target_job_title.trim() !== '' &&
    typeof r.professional_summary === 'string' && r.professional_summary.trim() !== '' &&
    typeof r.skills === 'object' && r.skills !== null &&
    Array.isArray(r.experience_bullets) && r.experience_bullets.length > 0 &&
    Array.isArray(r.education)
  );
}

interface Profile {
  _id: string;
  fullName: string;
  email: string;
  profileType?: 'software' | 'other';
}

interface FormData {
  profileId: string;
  title: string;
  company: string;
  jobDescription: string;
  jobLink: string;
}

export default function ResumeGeneratorPage() {
  const { ready } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState<FormData>(() => {
    try {
      const draft = sessionStorage.getItem('resume_generator_draft');
      if (draft) return JSON.parse(draft) as FormData;
    } catch { /* sessionStorage unavailable (SSR guard) */ }
    return { profileId: '', title: '', company: '', jobDescription: '', jobLink: '' };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    fetch('/api/profiles')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Profile[]) => {
        setProfiles(data);
        if (data.length === 0) return;
        const saved = localStorage.getItem('last_profile_id');
        const match = saved && data.find((p) => p._id === saved);
        setForm((f) => ({ ...f, profileId: f.profileId || (match ? saved! : data[0]._id) }));
      });
  }, [ready]);

  function setField(key: keyof FormData, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      try { sessionStorage.setItem('resume_generator_draft', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  async function handleGenerate(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Abort a stalled request instead of hanging forever (e.g. if the dev server dies mid-request).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 130_000);

    let navigating = false;
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: form.profileId,
          title: form.title,
          company: form.company,
          jobDescription: form.jobDescription,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Generation failed. Please try again.');
        return;
      }

      if (!isCompleteGenerated(data.generated) || !data.profile?.fullName) {
        setError('Generated resume is incomplete. Please try again.');
        return;
      }

      const reviewData: ResumeReviewData = {
        generated: data.generated,
        profileId: form.profileId,
        title: form.title,
        company: form.company,
        profile: data.profile,
        jobLink: form.jobLink || undefined,
        pdfTemplate: data.pdfTemplate ?? 'template1',
      };

      const serialized = JSON.stringify(reviewData);
      try {
        // sessionStorage is same-tab handoff; localStorage survives refresh on review.
        sessionStorage.setItem('resume_review', serialized);
        localStorage.setItem('resume_review', serialized);
      } catch {
        setError('Could not save the generated resume in browser storage. Try clearing site data or use a private window.');
        return;
      }
      try { sessionStorage.removeItem('resume_generator_draft'); } catch { /* ignore */ }

      // Hard navigation avoids App Router soft-nav hangs that leave "Rendering…" stuck.
      navigating = true;
      window.location.assign('/resume-generator/review');
      return;
    } catch (err) {
      setError(
        (err as Error)?.name === 'AbortError'
          ? 'Generation took too long and timed out. Please try again.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      clearTimeout(timeoutId);
      if (!navigating) setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Resume Generator</h1>
        <p className="text-sm text-gray-500 mb-8">Fill in the job details and generate a tailored resume.</p>

        <form onSubmit={handleGenerate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

          {/* Profile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile <span className="text-red-400">*</span>
            </label>
            {profiles.length === 0 ? (
              <p className="text-sm text-gray-400">No profiles found. <a href="/new-profile" className="text-blue-500 hover:underline">Create one first.</a></p>
            ) : (
              <select
                value={form.profileId}
                onChange={(e) => {
                  setField('profileId', e.target.value);
                  localStorage.setItem('last_profile_id', e.target.value);
                }}
                required
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

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={form.company}
              onChange={(e) => setField('company', e.target.value)}
              onBlur={(e) => setField('company', e.target.value.trim())}
              required
              className={inputCls}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              onBlur={(e) => setField('title', e.target.value.trim())}
              required
              className={inputCls}
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description <span className="text-red-400">*</span>
            </label>
            <textarea
              placeholder="Paste the full job description here…"
              rows={6}
              value={form.jobDescription}
              onChange={(e) => setField('jobDescription', e.target.value)}
              required
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Job Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Link <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://example.com/jobs/123"
              value={form.jobLink}
              onChange={(e) => setField('jobLink', e.target.value)}
              className={inputCls}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={profiles.length === 0 || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating… this may take ~30 seconds
              </>
            ) : (
              'Generate Resume'
            )}
          </button>

        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
