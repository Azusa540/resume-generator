import type { GeneratedResume, SkillCategories } from '@/types/resume';

export type PdfTemplate =
  | 'template1'
  | 'template2'
  | 'template3'
  | 'template4'
  | 'template5'
  | 'template6'
  | 'template7'
  | 'template8'
  | 'template9'
  | 'template10';

export interface ResumeProfileContact {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  linkedin?: string;
}

const FONTS: Record<PdfTemplate, string> = {
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

export const TEMPLATE_LABELS: Record<PdfTemplate, string> = {
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

/** template1–3 are free; template4–10 require admin or premium. */
export const FREE_TEMPLATES: PdfTemplate[] = ['template1', 'template2', 'template3'];
export const ALL_TEMPLATES: PdfTemplate[] = [
  'template1', 'template2', 'template3', 'template4', 'template5',
  'template6', 'template7', 'template8', 'template9', 'template10',
];

export function isPremiumTemplate(tpl: string): boolean {
  return !(FREE_TEMPLATES as string[]).includes(tpl);
}

/** Per-template accent color, applied to the job title and the LinkedIn link. */
const ACCENT_COLORS: Record<PdfTemplate, string> = {
  template1: '#1d4ed8',
  template2: '#7c2d12',
  template3: '#0f766e',
  template4: '#2563eb',
  template5: '#92400e',
  template6: '#4338ca',
  template7: '#9d174d',
  template8: '#b91c1c',
  template9: '#0369a1',
  template10: '#475569',
};

export function buildResumeFileName(
  fullName: string,
  targetJobTitle: string,
  company: string
): string {
  return `${fullName}_${targetJobTitle}_${company}`
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBoldHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function contactItems(profile: ResumeProfileContact, accentColor: string): { key: string; html: string }[] {
  const out: { key: string; html: string }[] = [];
  if (profile.email) out.push({ key: 'email', html: `<span>${escapeHtml(profile.email)}</span>` });
  if (profile.phone) out.push({ key: 'phone', html: `<span>${escapeHtml(profile.phone)}</span>` });
  if (profile.address) out.push({ key: 'addr', html: `<span>${escapeHtml(profile.address)}</span>` });
  if (profile.linkedin) {
    const label = profile.linkedin.replace(/^https?:\/\//, '');
    out.push({
      key: 'li',
      html: `<a href="${escapeHtml(profile.linkedin)}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color:${accentColor}">${escapeHtml(label)}</a>`,
    });
  }
  return out;
}

function joinWithSep(items: { key: string; html: string }[], sepHtml: string): string {
  return items
    .flatMap((item, i, arr) =>
      i < arr.length - 1 ? [item.html, sepHtml] : [item.html]
    )
    .join('');
}

function headerHtml(profile: ResumeProfileContact, jobTitle: string, tpl: PdfTemplate): string {
  const accent = ACCENT_COLORS[tpl];
  const items = contactItems(profile, accent);

  if (tpl === 'template2') {
    return `
      <div class="border-b border-gray-400 pb-4 mb-5 text-center">
        <h1 class="text-3xl font-bold text-gray-900 tracking-wide">${escapeHtml(profile.fullName)}</h1>
        <p class="text-base mt-1 italic" style="color:${accent}">${escapeHtml(jobTitle)}</p>
        <div class="flex flex-wrap justify-center items-center gap-y-0.5 mt-2 text-sm text-gray-500">
          ${joinWithSep(items, '<span class="mx-2 text-gray-300">|</span>')}
        </div>
      </div>`;
  }

  if (tpl === 'template3') {
    const mid = Math.ceil(items.length / 2);
    const row1 = items.slice(0, mid);
    const row2 = items.slice(mid);
    return `
      <div class="border-b-2 border-gray-700 pb-4 mb-5">
        <div class="flex items-baseline justify-between">
          <h1 class="text-3xl font-bold text-gray-900">${escapeHtml(profile.fullName)}</h1>
          <p class="text-sm font-semibold tracking-wide uppercase" style="color:${accent}">${escapeHtml(jobTitle)}</p>
        </div>
        <div class="mt-2 text-sm text-gray-500 space-y-0.5">
          <div class="flex flex-wrap gap-x-6">${row1.map((i) => i.html).join('')}</div>
          ${
            row2.length > 0
              ? `<div class="flex flex-wrap gap-x-6">${row2.map((i) => i.html).join('')}</div>`
              : ''
          }
        </div>
      </div>`;
  }

  if (tpl === 'template4') {
    return `
      <div style="border-left:4px solid ${accent};padding-left:16px;margin-bottom:24px">
        <h1 class="text-3xl font-bold text-gray-900">${escapeHtml(profile.fullName)}</h1>
        <p class="text-sm font-semibold uppercase tracking-widest mt-1" style="color:${accent}">${escapeHtml(jobTitle)}</p>
        <div class="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-gray-500">
          ${joinWithSep(items, '<span style="color:#93c5fd;margin:0 8px">›</span>')}
        </div>
      </div>`;
  }

  if (tpl === 'template5') {
    return `
      <div class="text-center mb-6">
        <div style="border-top:2.5px solid #1a1a1a;border-bottom:1px solid #1a1a1a;padding:8px 0 6px">
          <h1 style="font-size:1.75rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#1a1a1a;margin:0">${escapeHtml(profile.fullName)}</h1>
        </div>
        <p class="text-sm italic mt-2" style="color:${accent}">${escapeHtml(jobTitle)}</p>
        <div class="flex flex-wrap justify-center items-center gap-x-4 gap-y-0.5 mt-1.5 text-sm text-gray-500">
          ${items.map((i) => i.html).join('')}
        </div>
      </div>`;
  }

  if (tpl === 'template6') {
    return `
      <div class="border-b-2 border-gray-900 pb-3 mb-4">
        <div class="flex items-baseline gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(profile.fullName)}</h1>
          <span class="text-gray-300 text-xl select-none">|</span>
          <span class="text-sm font-medium" style="color:${accent}">${escapeHtml(jobTitle)}</span>
        </div>
        <div class="flex flex-wrap items-center gap-y-0.5 mt-1.5 text-xs text-gray-500">
          ${joinWithSep(items, '<span class="mx-2 text-gray-300">•</span>')}
        </div>
      </div>`;
  }

  if (tpl === 'template7') {
    return `
      <div class="text-center mb-6">
        <h1 style="font-size:2.25rem;font-weight:700;color:#1f2937;letter-spacing:-0.01em;margin:0">${escapeHtml(profile.fullName)}</h1>
        <p style="font-size:1rem;font-style:italic;color:${accent};margin-top:4px">${escapeHtml(jobTitle)}</p>
        <div class="flex flex-wrap justify-center items-center gap-x-4 gap-y-0.5 mt-2 text-sm text-gray-500">
          ${items.map((i) => i.html).join('')}
        </div>
      </div>`;
  }

  if (tpl === 'template8') {
    return `
      <div class="mb-6">
        <h1 style="font-size:2.75rem;font-weight:800;color:#111827;line-height:1.1;margin:0">${escapeHtml(profile.fullName)}</h1>
        <p class="text-xs font-semibold uppercase tracking-widest mt-2" style="color:${accent}">${escapeHtml(jobTitle)}</p>
        <div style="height:3px;background:#111827;margin:8px 0;width:56px"></div>
        <div class="flex flex-wrap items-center gap-y-0.5 text-sm text-gray-500">
          ${joinWithSep(items, '<span class="mx-2 text-gray-300">—</span>')}
        </div>
      </div>`;
  }

  if (tpl === 'template9') {
    return `
      <div class="mb-5">
        <div style="border-bottom:3px double #374151;padding-bottom:10px">
          <h1 class="text-2xl font-bold text-gray-800">${escapeHtml(profile.fullName)}</h1>
          <p class="text-sm font-semibold mt-0.5" style="color:${accent}">${escapeHtml(jobTitle)}</p>
          <div class="flex flex-wrap items-center gap-y-0.5 mt-2 text-xs text-gray-500">
            ${joinWithSep(items, '<span class="mx-2 text-gray-300">·</span>')}
          </div>
        </div>
      </div>`;
  }

  if (tpl === 'template10') {
    return `
      <div class="mb-8">
        <h1 style="font-size:2rem;font-weight:300;color:#111827;letter-spacing:0.02em;margin:0">${escapeHtml(profile.fullName)}</h1>
        <p style="font-size:0.875rem;color:${accent};font-weight:400;margin-top:3px;letter-spacing:0.04em">${escapeHtml(jobTitle)}</p>
        <div style="width:100%;height:1px;background:#e5e7eb;margin:10px 0 8px"></div>
        <div class="flex flex-wrap items-center gap-y-0.5 text-xs text-gray-400">
          ${joinWithSep(items, '<span class="mx-3 text-gray-200">·</span>')}
        </div>
      </div>`;
  }

  // template1
  return `
    <div class="border-b-2 border-gray-800 pb-4 mb-5">
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">${escapeHtml(profile.fullName)}</h1>
      <p class="text-base font-semibold mt-0.5" style="color:${accent}">${renderBoldHtml(jobTitle)}</p>
      <div class="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-gray-600">
        ${joinWithSep(items, '<span class="mx-2 text-gray-300">·</span>')}
      </div>
    </div>`;
}

function sectionTitleHtml(title: string, tpl: PdfTemplate): string {
  if (tpl === 'template2') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 border-b-2 border-gray-700 pb-1" style="break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template3') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2 pb-1" style="border-bottom:1px solid #9ca3af;letter-spacing:0.15em;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template4') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest mb-2" style="border-left:3px solid #2563eb;padding-left:8px;color:#2563eb;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template5') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2" style="display:flex;align-items:center;gap:8px;break-after:avoid">
      <span style="flex:1;height:1px;background:#9ca3af"></span>${escapeHtml(title)}<span style="flex:1;height:1px;background:#9ca3af"></span>
    </h2>`;
  }
  if (tpl === 'template6') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2" style="break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template7') {
    return `<h2 class="text-sm font-bold text-gray-600 mb-2 pb-1" style="font-style:italic;border-bottom:1px solid #d1d5db;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template8') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest mb-2" style="border-left:4px solid #111827;padding-left:8px;color:#111827;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template9') {
    return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 pb-1" style="border-bottom:2px solid #6b7280;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  if (tpl === 'template10') {
    return `<h2 class="text-xs uppercase tracking-widest text-gray-400 mb-3 pb-1" style="font-weight:400;letter-spacing:0.15em;border-bottom:1px solid #f3f4f6;break-after:avoid">${escapeHtml(title)}</h2>`;
  }
  return `<h2 class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1" style="break-after:avoid">${escapeHtml(title)}</h2>`;
}

function sectionHtml(title: string, body: string, tpl: PdfTemplate, avoidBreak = false): string {
  return `
    <div class="mb-5"${avoidBreak ? ' style="break-inside:avoid"' : ''}>
      ${sectionTitleHtml(title, tpl)}
      ${body}
    </div>`;
}

function skillsHtml(skills: GeneratedResume['skills']): string {
  if (Array.isArray(skills)) {
    return `<span class="text-sm text-gray-800 font-semibold">${escapeHtml((skills as unknown as string[]).join(', '))}</span>`;
  }
  return Object.entries(skills as SkillCategories)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(
      ([category, items]) => `
      <div class="text-sm text-gray-800 leading-snug">
        <span class="font-bold">${escapeHtml(category)}</span>
        <span class="font-normal">: ${escapeHtml(items.join(', '))}</span>
      </div>`
    )
    .join('');
}

function experienceHtml(generated: GeneratedResume): string {
  return generated.experience_bullets
    .map(
      (exp) => `
      <div class="mb-4 last:mb-0">
        <div style="break-inside:avoid;break-after:avoid">
          <div class="flex justify-between items-baseline">
            <span class="text-sm font-semibold text-gray-900">${escapeHtml(exp.company)}</span>
            ${exp.period ? `<span class="text-xs text-gray-500 shrink-0 ml-4">${escapeHtml(exp.period)}</span>` : ''}
          </div>
          <p class="text-sm text-blue-700 font-medium mb-1.5">${escapeHtml(exp.job_title)}</p>
        </div>
        <ul class="space-y-1">
          ${exp.bullets
            .map(
              (b) => `
            <li class="text-sm text-gray-700 leading-relaxed flex items-start gap-2" style="break-inside:avoid">
              <span class="mt-[0.45em] shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
              <span>${renderBoldHtml(b)}</span>
            </li>`
            )
            .join('')}
        </ul>
      </div>`
    )
    .join('');
}

function educationHtml(generated: GeneratedResume): string {
  return generated.education
    .map(
      (edu) => `
      <div class="mb-3 last:mb-0" style="break-inside:avoid">
        <div class="flex justify-between items-baseline">
          <span class="text-sm font-semibold text-gray-900">${escapeHtml(edu.university)}</span>
          <span class="text-xs text-gray-500 shrink-0 ml-4">${escapeHtml(edu.period)}</span>
        </div>
        <p class="text-sm text-gray-600">${escapeHtml(edu.degree)}</p>
      </div>`
    )
    .join('');
}

/** Resume document HTML (Tailwind classes) matching the review page templates. */
export function buildResumeDocHtml(
  generated: GeneratedResume,
  profile: ResumeProfileContact,
  tpl: PdfTemplate = 'template1'
): string {
  const skillsBody = `<div class="flex flex-col gap-y-1">${skillsHtml(generated.skills)}</div>`;
  const summaryBody = `<p class="text-sm text-gray-700 leading-relaxed">${renderBoldHtml(generated.professional_summary)}</p>`;

  return `
    <div id="resume-doc" class="max-w-[820px] mx-auto bg-white shadow-md mb-12 px-14 py-12 print:shadow-none print:px-10 print:py-8" style="font-family:${FONTS[tpl]}">
      ${headerHtml(profile, generated.target_job_title, tpl)}
      ${sectionHtml('Professional Summary', summaryBody, tpl, true)}
      ${sectionHtml('Skills', skillsBody, tpl, true)}
      ${
        generated.experience_bullets.length > 0
          ? sectionHtml('Experience', experienceHtml(generated), tpl)
          : ''
      }
      ${
        generated.education.length > 0
          ? sectionHtml('Education', educationHtml(generated), tpl, true)
          : ''
      }
    </div>`;
}

/** Full HTML page wrapper used by Puppeteer (same as /api/resume/pdf). */
export function wrapResumePage(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    body { margin: 0; padding: 0; background: #fff; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}
