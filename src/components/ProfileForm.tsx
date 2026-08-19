'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/session';

export interface EducationEntry {
  university: string;
  degree: string;
  from: string;
  to: string;
}

export interface EmploymentEntry {
  companyName: string;
  from: string;
  to: string;
  position: string;
  desc: string;
}

export interface ProfileFormData {
  fullName: string;
  address: string;
  email: string;
  phone: string;
  linkedin: string;
  education: EducationEntry[];
  employment: EmploymentEntry[];
  pdfTemplate?: 'template1' | 'template2' | 'template3' | 'template4' | 'template5' | 'template6' | 'template7' | 'template8' | 'template9' | 'template10';
  profileType?: 'software' | 'other';
  customPrompt?: string;
}

const emptyEducation = (): EducationEntry => ({ university: '', degree: '', from: '', to: '' });
const emptyEmployment = (): EmploymentEntry => ({
  companyName: '',
  from: '',
  to: '',
  position: '',
  desc: '',
});

interface Props {
  initial?: Partial<ProfileFormData>;
  profileId?: string;
}

export default function ProfileForm({ initial, profileId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormData>({
    fullName: initial?.fullName ?? '',
    address: initial?.address ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    linkedin: initial?.linkedin ?? '',
    education: initial?.education ?? [],
    employment: initial?.employment ?? [],
    pdfTemplate: initial?.pdfTemplate ?? 'template1',
    profileType: initial?.profileType ?? 'software',
    customPrompt: initial?.customPrompt ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [canUsePremiumTemplates, setCanUsePremiumTemplates] = useState(false);

  useEffect(() => {
    const session = getSession();
    setCanUsePremiumTemplates(Boolean(session?.isAdmin || session?.isPremium));
  }, []);

  // ── per-entry edit state ─────────────────────────────────────────────────
  const [editingEduIdx, setEditingEduIdx] = useState<number | null>(null);
  const [eduDraft, setEduDraft] = useState<EducationEntry>(emptyEducation());

  const [editingEmpIdx, setEditingEmpIdx] = useState<number | null>(null);
  const [empDraft, setEmpDraft] = useState<EmploymentEntry>(emptyEmployment());

  // ── top-level fields ──────────────────────────────────────────────────────
  function setField(key: keyof ProfileFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── education ─────────────────────────────────────────────────────────────
  function addEdu() {
    const entry = emptyEducation();
    setForm((f) => ({ ...f, education: [...f.education, entry] }));
    setEduDraft(entry);
    setEditingEduIdx(form.education.length);
  }

  function startEditEdu(i: number) {
    setEduDraft({ ...form.education[i] });
    setEditingEduIdx(i);
  }

  function saveEdu() {
    if (editingEduIdx === null) return;
    setForm((f) => {
      const education = [...f.education];
      education[editingEduIdx] = eduDraft;
      return { ...f, education };
    });
    setEditingEduIdx(null);
  }

  function cancelEdu(i: number) {
    // If newly added and still empty, remove it
    const entry = form.education[i];
    if (!entry.university && !entry.degree && !entry.from && !entry.to) {
      setForm((f) => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }));
    }
    setEditingEduIdx(null);
  }

  function removeEdu(i: number) {
    setForm((f) => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }));
    if (editingEduIdx === i) setEditingEduIdx(null);
  }

  // ── employment ────────────────────────────────────────────────────────────
  function addEmp() {
    const entry = emptyEmployment();
    setForm((f) => ({ ...f, employment: [...f.employment, entry] }));
    setEmpDraft(entry);
    setEditingEmpIdx(form.employment.length);
  }

  function startEditEmp(i: number) {
    setEmpDraft({ ...form.employment[i] });
    setEditingEmpIdx(i);
  }

  function saveEmp() {
    if (editingEmpIdx === null) return;
    setForm((f) => {
      const employment = [...f.employment];
      employment[editingEmpIdx] = empDraft;
      return { ...f, employment };
    });
    setEditingEmpIdx(null);
  }

  function cancelEmp(i: number) {
    const entry = form.employment[i];
    if (!entry.companyName && !entry.position && !entry.from && !entry.to && !entry.desc) {
      setForm((f) => ({ ...f, employment: f.employment.filter((_, idx) => idx !== i) }));
    }
    setEditingEmpIdx(null);
  }

  function removeEmp(i: number) {
    setForm((f) => ({ ...f, employment: f.employment.filter((_, idx) => idx !== i) }));
    if (editingEmpIdx === i) setEditingEmpIdx(null);
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const url = profileId ? `/api/profiles/${profileId}` : '/api/profiles';
      const method = profileId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Save failed.');
        return;
      }
      router.push('/profiles');
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Basic Info ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Basic Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *">
            <input type="text" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Phone">
            <input type="text" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputCls} />
          </Field>
          <Field label="LinkedIn URL">
            <input type="url" value={form.linkedin} onChange={(e) => setField('linkedin', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Profile Type">
            <select
              value={form.profileType ?? 'software'}
              onChange={(e) => setForm((f) => ({ ...f, profileType: e.target.value as ProfileFormData['profileType'] }))}
              className={inputCls}
            >
              <option value="software">Software / IT</option>
              <option value="other">Other (Non-Software)</option>
            </select>
          </Field>
          <Field label="PDF Template" className="sm:col-span-2">
            <select
              value={form.pdfTemplate ?? 'template1'}
              onChange={(e) => setForm((f) => ({ ...f, pdfTemplate: e.target.value as ProfileFormData['pdfTemplate'] }))}
              className={inputCls}
            >
              <option value="template1">Template 1 – Clean Minimal</option>
              <option value="template2">Template 2 – Classic Serif</option>
              <option value="template3">Template 3 – Contemporary</option>
              {canUsePremiumTemplates && (
                <>
                  <option value="template4">Template 4 – Modern Accent</option>
                  <option value="template5">Template 5 – Executive</option>
                  <option value="template6">Template 6 – Compact Pro</option>
                  <option value="template7">Template 7 – Elegant Serif</option>
                  <option value="template8">Template 8 – Bold Impact</option>
                  <option value="template9">Template 9 – Open Professional</option>
                  <option value="template10">Template 10 – Minimalist</option>
                </>
              )}
            </select>
            {!canUsePremiumTemplates && (
              <p className="mt-1 text-xs text-gray-400">
                7 more templates are available on a premium account.
              </p>
            )}
          </Field>
          <Field label="Custom AI Prompt (optional)" className="sm:col-span-2">
            <textarea
              value={form.customPrompt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, customPrompt: e.target.value }))}
              rows={4}
              placeholder="Add extra instructions for the AI when generating resumes for this profile. e.g. 'Always emphasize leadership experience.' or 'This candidate prefers concise bullets under 30 words.'"
              className={`${inputCls} resize-y`}
            />
            <p className="mt-1 text-xs text-gray-400">
              {form.customPrompt?.trim()
                ? 'Custom prompt active — appended to the default AI instructions for this profile.'
                : 'Using default prompt. Add instructions above to customize AI output for this profile only.'}
            </p>
          </Field>
        </div>
      </section>

      {/* ── Education ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Education</h2>
          <button type="button" onClick={addEdu} className={addBtnCls} disabled={editingEduIdx !== null}>
            + Add
          </button>
        </div>

        {form.education.length === 0 && (
          <p className="text-sm text-gray-400">No education entries yet.</p>
        )}

        {form.education.map((edu, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4">
            {editingEduIdx === i ? (
              /* ── edit mode ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="University *">
                  <input type="text" value={eduDraft.university} onChange={(e) => setEduDraft((d) => ({ ...d, university: e.target.value }))} required className={inputCls} autoFocus />
                </Field>
                <Field label="Degree *">
                  <input type="text" value={eduDraft.degree} onChange={(e) => setEduDraft((d) => ({ ...d, degree: e.target.value }))} required className={inputCls} />
                </Field>
                <Field label="From *">
                  <input type="text" placeholder="e.g. 2018" value={eduDraft.from} onChange={(e) => setEduDraft((d) => ({ ...d, from: e.target.value }))} required className={inputCls} />
                </Field>
                <Field label="To *">
                  <input type="text" placeholder="e.g. 2022 or Present" value={eduDraft.to} onChange={(e) => setEduDraft((d) => ({ ...d, to: e.target.value }))} required className={inputCls} />
                </Field>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button type="button" onClick={saveEdu} className={saveBtnCls}>Save</button>
                  <button type="button" onClick={() => cancelEdu(i)} className={cancelItemBtnCls}>Cancel</button>
                </div>
              </div>
            ) : (
              /* ── view mode ── */
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-900">{edu.university}</p>
                  <p className="text-sm text-gray-600">{edu.degree}</p>
                  <p className="text-xs text-gray-400">{edu.from} – {edu.to}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => startEditEdu(i)} className={editIconBtnCls} disabled={editingEduIdx !== null} title="Edit">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={() => removeEdu(i)} className={removeIconBtnCls} title="Remove">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ── Employment ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Employment</h2>
          <button type="button" onClick={addEmp} className={addBtnCls} disabled={editingEmpIdx !== null}>
            + Add
          </button>
        </div>

        {form.employment.length === 0 && (
          <p className="text-sm text-gray-400">No employment entries yet.</p>
        )}

        {form.employment.map((emp, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4">
            {editingEmpIdx === i ? (
              /* ── edit mode ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company Name *" className="sm:col-span-2">
                  <input type="text" value={empDraft.companyName} onChange={(e) => setEmpDraft((d) => ({ ...d, companyName: e.target.value }))} required className={inputCls} autoFocus />
                </Field>
                <Field label="Position" className="sm:col-span-2">
                  <input type="text" value={empDraft.position} onChange={(e) => setEmpDraft((d) => ({ ...d, position: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="From">
                  <input type="text" placeholder="e.g. Jan 2020" value={empDraft.from} onChange={(e) => setEmpDraft((d) => ({ ...d, from: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="To">
                  <input type="text" placeholder="e.g. Present" value={empDraft.to} onChange={(e) => setEmpDraft((d) => ({ ...d, to: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <textarea rows={3} value={empDraft.desc} onChange={(e) => setEmpDraft((d) => ({ ...d, desc: e.target.value }))} className={`${inputCls} resize-none`} />
                </Field>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button type="button" onClick={saveEmp} className={saveBtnCls}>Save</button>
                  <button type="button" onClick={() => cancelEmp(i)} className={cancelItemBtnCls}>Cancel</button>
                </div>
              </div>
            ) : (
              /* ── view mode ── */
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {emp.position ? `${emp.position} @ ${emp.companyName}` : emp.companyName}
                  </p>
                  {(emp.from || emp.to) && (
                    <p className="text-xs text-gray-400">{emp.from}{emp.from && emp.to ? ' – ' : ''}{emp.to}</p>
                  )}
                  {emp.desc && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{emp.desc}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => startEditEmp(i)} className={editIconBtnCls} disabled={editingEmpIdx !== null} title="Edit">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={() => removeEmp(i)} className={removeIconBtnCls} title="Remove">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={submitBtnCls}>
          {saving ? 'Saving…' : profileId ? 'Save Changes' : 'Create Profile'}
        </button>
        <button type="button" onClick={() => router.push('/profiles')} className={cancelBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
const editIconBtnCls =
  'p-1.5 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const removeIconBtnCls =
  'p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors';
const addBtnCls =
  'text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-md px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const saveBtnCls =
  'text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md px-3 py-1 transition-colors';
const cancelItemBtnCls =
  'text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-md px-3 py-1 transition-colors';
const submitBtnCls =
  'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors';
const cancelBtnCls =
  'text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-5 py-2 rounded-lg transition-colors';

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
