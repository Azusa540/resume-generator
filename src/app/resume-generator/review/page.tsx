'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { buildResumeFileName } from '@/lib/resumeHtml';
import type { ResumeReviewData, GeneratedExperienceBullet, GeneratedEducation } from '@/types/resume';

function readReviewData(): ResumeReviewData | null {
  try {
    const raw =
      sessionStorage.getItem('resume_review') ??
      localStorage.getItem('resume_review');
    if (!raw) return null;
    return JSON.parse(raw) as ResumeReviewData;
  } catch {
    return null;
  }
}

export default function ResumeReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ResumeReviewData | null>(null);
  const [ready, setReady] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const review = readReviewData();
    if (!review) {
      router.replace('/resume-generator');
      return;
    }
    setData(review);
    setReady(true);
  }, [router]);

  async function handleDownloadPdf() {
    if (!data) return;
    setDownloadingPdf(true); setDownloadError('');
    try {
      const el = document.getElementById('resume-doc');
      if (!el) return;
      const downloadFileName = buildResumeFileName(
        data.profile.fullName,
        data.generated.target_job_title,
        data.company
      );
      const res = await fetch('/api/resume/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: el.outerHTML,
          profileId: data.profileId,
          fileName: downloadFileName,
        }),
      });
      if (!res.ok) { const err = await res.json(); setDownloadError(err.message || 'PDF generation failed.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${downloadFileName}.pdf`; a.click();
      URL.revokeObjectURL(url);

      // Persist the job details for this download into the bid_details collection.
      // Fire-and-forget: a save failure must not disrupt the completed download.
      saveBidDetails(data);
    } catch { setDownloadError('Something went wrong.'); }
    finally { setDownloadingPdf(false); }
  }

  async function saveBidDetails(d: ResumeReviewData) {
    try {
      await fetch('/api/bid-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: d.profileId,
          jobTitle: d.title,
          company: d.company,
          jobLink: d.jobLink ?? '',
        }),
      });
    } catch (err) {
      console.error('[bid-details] save failed:', err);
    }
  }

  if (!ready || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading review…</p>
      </div>
    );
  }

  const tpl = data.pdfTemplate ?? 'template1';
  const tplLabel = TPL_LABELS[tpl] ?? 'Clean Minimal';

  return (
    <div className="min-h-screen bg-gray-100">
      <Nav />
      <div className="max-w-[820px] mx-auto px-4 pt-6 pb-2 flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => router.push('/resume-generator')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {data.jobLink && (
            <a href={data.jobLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              View Job Posting →
            </a>
          )}
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{tplLabel}</span>
          <button onClick={handleDownloadPdf} disabled={downloadingPdf}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
            {downloadingPdf ? 'Generating…' : '↓ Download PDF'}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="max-w-[820px] mx-auto px-4 pb-2">
          <p className="text-sm text-red-500">{downloadError}</p>
        </div>
      )}

      <ResumeDoc data={data} tpl={tpl} />

      <style>{`
        @media print {
          nav, button, a[href^="http"] { display: none !important; }
          #resume-doc { margin: 0; max-width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ─── Shared renderer ──────────────────────────────────────────────────────────

type Tpl = 'template1' | 'template2' | 'template3' | 'template4' | 'template5' | 'template6' | 'template7' | 'template8' | 'template9' | 'template10';

const FONTS: Record<Tpl, string> = {
  template1: 'Inter, sans-serif',
  template2: 'Georgia, "Times New Roman", serif',
  template3: '"Trebuchet MS", "Gill Sans", sans-serif',
  template4: 'Inter, sans-serif',
  template5: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  template6: '"Arial", "Helvetica Neue", Helvetica, sans-serif',
  template7: 'Lora, Georgia, serif',
  template8: 'Inter, system-ui, sans-serif',
  template9: 'Verdana, Geneva, sans-serif',
  template10: 'Inter, system-ui, -apple-system, sans-serif',
};

const TPL_LABELS: Record<Tpl, string> = {
  template1: 'Clean Minimal',
  template2: 'Classic Serif',
  template3: 'Contemporary',
  template4: 'Modern Accent',
  template5: 'Executive',
  template6: 'Compact Pro',
  template7: 'Elegant Serif',
  template8: 'Bold Impact',
  template9: 'Open Professional',
  template10: 'Minimalist',
};

function ResumeDoc({ data, tpl }: { data: ResumeReviewData; tpl: Tpl }) {
  const { generated, profile } = data;
  return (
    <div
      id="resume-doc"
      className="max-w-[820px] mx-auto bg-white shadow-md mb-12 px-14 py-12 print:shadow-none print:px-10 print:py-8"
      style={{ fontFamily: FONTS[tpl] }}
    >
      <Header profile={profile} jobTitle={generated.target_job_title} tpl={tpl} />

      <Section title="Professional Summary" avoidBreak tpl={tpl}>
        <p className="text-sm text-gray-700 leading-relaxed">{renderBold(generated.professional_summary)}</p>
      </Section>

      <Section title="Skills" avoidBreak tpl={tpl}>
        <div className="flex flex-col gap-y-1">
          {Array.isArray(generated.skills)
            ? <span className="text-sm text-gray-800 font-semibold">{(generated.skills as unknown as string[]).join(', ')}</span>
            : Object.entries(generated.skills)
                .filter(([, items]) => Array.isArray(items) && items.length > 0)
                .map(([category, items]) => (
                  <div key={category} className="text-sm text-gray-800 leading-snug">
                    <span className="font-bold">{category}</span>
                    <span className="font-normal">: {items.join(', ')}</span>
                  </div>
                ))}
        </div>
      </Section>

      {generated.experience_bullets.length > 0 && (
        <Section title="Experience" tpl={tpl}>
          {generated.experience_bullets.map((exp) => <ExpBlock key={exp.experience_id} exp={exp} />)}
        </Section>
      )}

      {generated.education.length > 0 && (
        <Section title="Education" avoidBreak tpl={tpl}>
          {generated.education.map((edu) => <EduBlock key={edu.education_id} edu={edu} />)}
        </Section>
      )}
    </div>
  );
}

// ─── Header variants ──────────────────────────────────────────────────────────

function Header({ profile, jobTitle, tpl }: { profile: ResumeReviewData['profile']; jobTitle: string; tpl: Tpl }) {
  if (tpl === 'template1') return <Header1 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template2') return <Header2 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template3') return <Header3 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template4') return <Header4 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template5') return <Header5 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template6') return <Header6 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template7') return <Header7 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template8') return <Header8 profile={profile} jobTitle={jobTitle} />;
  if (tpl === 'template9') return <Header9 profile={profile} jobTitle={jobTitle} />;
  return <Header10 profile={profile} jobTitle={jobTitle} />;
}

/** T1 — left-aligned, contacts as horizontal dot-separated row */
function Header1({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="border-b-2 border-gray-800 pb-4 mb-5">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.fullName}</h1>
      <p className="text-base font-semibold text-blue-700 mt-0.5">{renderBold(jobTitle)}</p>
      <div className="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-gray-600">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-2 text-gray-300">·</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

/** T2 — centered name & job title, contacts centered with pipe separators */
function Header2({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="border-b border-gray-400 pb-4 mb-5 text-center">
      <h1 className="text-3xl font-bold text-gray-900 tracking-wide">{profile.fullName}</h1>
      <p className="text-base text-gray-600 mt-1 italic">{jobTitle}</p>
      <div className="flex flex-wrap justify-center items-center gap-y-0.5 mt-2 text-sm text-gray-500">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-2 text-gray-300">|</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

/** T3 — name left + job title inline right; contacts stacked in two columns below */
function Header3({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  // split contacts into two rows
  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid);
  const row2 = items.slice(mid);
  return (
    <div className="border-b-2 border-gray-700 pb-4 mb-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
        <p className="text-sm font-semibold text-gray-600 tracking-wide uppercase">{jobTitle}</p>
      </div>
      <div className="mt-2 text-sm text-gray-500 space-y-0.5">
        <div className="flex flex-wrap gap-x-6">
          {row1.map((item) => <span key={item.key}>{item.node}</span>)}
        </div>
        {row2.length > 0 && (
          <div className="flex flex-wrap gap-x-6">
            {row2.map((item) => <span key={item.key}>{item.node}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** T4 — Modern Accent: blue left border bar, accent separators */
function Header4({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div style={{ borderLeft: '4px solid #2563eb', paddingLeft: '16px', marginBottom: '24px' }}>
      <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
      <p className="text-sm font-semibold uppercase tracking-widest mt-1" style={{ color: '#2563eb' }}>{jobTitle}</p>
      <div className="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-gray-500">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} style={{ color: '#93c5fd', margin: '0 8px' }}>›</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

/** T5 — Executive: centered, all-caps name between double rules */
function Header5({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="text-center mb-6">
      <div style={{ borderTop: '2.5px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '8px 0 6px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1a1a', margin: 0 }}>
          {profile.fullName}
        </h1>
      </div>
      <p className="text-sm italic text-gray-600 mt-2">{jobTitle}</p>
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-0.5 mt-1.5 text-sm text-gray-500">
        {items.map(item => <span key={item.key}>{item.node}</span>)}
      </div>
    </div>
  );
}

/** T6 — Compact Pro: name + job title on one line, very tight */
function Header6({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="border-b-2 border-gray-900 pb-3 mb-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{profile.fullName}</h1>
        <span className="text-gray-300 text-xl select-none">|</span>
        <span className="text-sm font-medium text-gray-600">{jobTitle}</span>
      </div>
      <div className="flex flex-wrap items-center gap-y-0.5 mt-1.5 text-xs text-gray-500">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-2 text-gray-300">•</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

/** T7 — Elegant Serif (Lora): centered, italic subtitle, short decorative rule */
function Header7({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="text-center mb-6">
      <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1f2937', letterSpacing: '-0.01em', margin: 0 }}>
        {profile.fullName}
      </h1>
      <p style={{ fontSize: '1rem', fontStyle: 'italic', color: '#6b7280', marginTop: '4px' }}>{jobTitle}</p>
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-0.5 mt-2 text-sm text-gray-500">
        {items.map(item => <span key={item.key}>{item.node}</span>)}
      </div>
    </div>
  );
}

/** T8 — Bold Impact: extra-large heavy name, small tracked job title, short accent bar */
function Header8({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="mb-6">
      <h1 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: 0 }}>
        {profile.fullName}
      </h1>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-2">{jobTitle}</p>
      <div style={{ height: '3px', background: '#111827', margin: '8px 0', width: '56px' }} />
      <div className="flex flex-wrap items-center gap-y-0.5 text-sm text-gray-500">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-2 text-gray-300">—</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

/** T9 — Open Professional (Verdana): bold name, double bottom rule */
function Header9({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="mb-5">
      <div style={{ borderBottom: '3px double #374151', paddingBottom: '10px' }}>
        <h1 className="text-2xl font-bold text-gray-800">{profile.fullName}</h1>
        <p className="text-sm font-semibold text-gray-600 mt-0.5">{jobTitle}</p>
        <div className="flex flex-wrap items-center gap-y-0.5 mt-2 text-xs text-gray-500">
          {items.flatMap((item, i, arr) =>
            i < arr.length - 1
              ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-2 text-gray-300">·</span>]
              : [<span key={item.key}>{item.node}</span>]
          )}
        </div>
      </div>
    </div>
  );
}

/** T10 — Minimalist: light-weight name, very subtle full-width rule, airy spacing */
function Header10({ profile, jobTitle }: { profile: ResumeReviewData['profile']; jobTitle: string }) {
  const items = contactList(profile);
  return (
    <div className="mb-8">
      <h1 style={{ fontSize: '2rem', fontWeight: 300, color: '#111827', letterSpacing: '0.02em', margin: 0 }}>
        {profile.fullName}
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 400, marginTop: '3px', letterSpacing: '0.04em' }}>
        {jobTitle}
      </p>
      <div style={{ width: '100%', height: '1px', background: '#e5e7eb', margin: '10px 0 8px' }} />
      <div className="flex flex-wrap items-center gap-y-0.5 text-xs text-gray-400">
        {items.flatMap((item, i, arr) =>
          i < arr.length - 1
            ? [<span key={item.key}>{item.node}</span>, <span key={`d${i}`} className="mx-3 text-gray-200">·</span>]
            : [<span key={item.key}>{item.node}</span>]
        )}
      </div>
    </div>
  );
}

// ─── Section title variants ───────────────────────────────────────────────────

function getSectionTitle(title: string, tpl: Tpl): React.ReactNode {
  if (tpl === 'template2')
    return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 border-b-2 border-gray-700 pb-1" style={{ breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template3')
    return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2 pb-1" style={{ borderBottom: '1px solid #9ca3af', letterSpacing: '0.15em', breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template4')
    return <h2 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ borderLeft: '3px solid #2563eb', paddingLeft: '8px', color: '#2563eb', breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template5')
    return (
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', breakAfter: 'avoid' } as React.CSSProperties}>
        <span style={{ flex: 1, height: '1px', background: '#9ca3af' }} />
        {title}
        <span style={{ flex: 1, height: '1px', background: '#9ca3af' }} />
      </h2>
    );
  if (tpl === 'template6')
    return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2" style={{ breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template7')
    return <h2 className="text-sm font-bold text-gray-600 mb-2 pb-1" style={{ fontStyle: 'italic', borderBottom: '1px solid #d1d5db', breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template8')
    return <h2 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ borderLeft: '4px solid #111827', paddingLeft: '8px', color: '#111827', breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template9')
    return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 pb-1" style={{ borderBottom: '2px solid #6b7280', breakAfter: 'avoid' }}>{title}</h2>;
  if (tpl === 'template10')
    return <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 pb-1" style={{ fontWeight: 400, letterSpacing: '0.15em', borderBottom: '1px solid #f3f4f6', breakAfter: 'avoid' }}>{title}</h2>;
  return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1" style={{ breakAfter: 'avoid' }}>{title}</h2>;
}

function Section({ title, children, avoidBreak = false, tpl }: {
  title: string; children: React.ReactNode; avoidBreak?: boolean; tpl: Tpl;
}) {
  return (
    <div className="mb-5" style={avoidBreak ? { breakInside: 'avoid' } : undefined}>
      {getSectionTitle(title, tpl)}
      {children}
    </div>
  );
}

// ─── Shared experience & education blocks ────────────────────────────────────

function ExpBlock({ exp }: { exp: GeneratedExperienceBullet }) {
  return (
    <div className="mb-4 last:mb-0">
      {/* Company + job title must stay together, and stick to at least the first bullet */}
      <div style={{ breakInside: 'avoid', breakAfter: 'avoid' }}>
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-gray-900">{exp.company}</span>
          {exp.period && <span className="text-xs text-gray-500 shrink-0 ml-4">{exp.period}</span>}
        </div>
        <p className="text-sm text-blue-700 font-medium mb-1.5">{exp.job_title}</p>
      </div>
      <ul className="space-y-1">
        {exp.bullets.map((b, i) => (
          <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2" style={{ breakInside: 'avoid' }}>
            <span className="mt-[0.45em] shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
            <span>{renderBold(b)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EduBlock({ edu }: { edu: GeneratedEducation }) {
  return (
    <div className="mb-3 last:mb-0" style={{ breakInside: 'avoid' }}>
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-gray-900">{edu.university}</span>
        <span className="text-xs text-gray-500 shrink-0 ml-4">{edu.period}</span>
      </div>
      <p className="text-sm text-gray-600">{edu.degree}</p>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
}

function contactList(profile: ResumeReviewData['profile']): { key: string; node: React.ReactNode }[] {
  const out: { key: string; node: React.ReactNode }[] = [];
  if (profile.email)    out.push({ key: 'email', node: <span>{profile.email}</span> });
  if (profile.phone)    out.push({ key: 'phone', node: <span>{profile.phone}</span> });
  if (profile.address)  out.push({ key: 'addr',  node: <span>{profile.address}</span> });
  if (profile.linkedin) out.push({ key: 'li', node: (
    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {profile.linkedin.replace(/^https?:\/\//, '')}
    </a>
  )});
  return out;
}
