import type { GeneratedResume, SkillCategories } from '@/types/resume';

export type PdfTemplate = 'template1' | 'template2' | 'template3';

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

function contactItems(profile: ResumeProfileContact): { key: string; html: string }[] {
  const out: { key: string; html: string }[] = [];
  if (profile.email) out.push({ key: 'email', html: `<span>${escapeHtml(profile.email)}</span>` });
  if (profile.phone) out.push({ key: 'phone', html: `<span>${escapeHtml(profile.phone)}</span>` });
  if (profile.address) out.push({ key: 'addr', html: `<span>${escapeHtml(profile.address)}</span>` });
  if (profile.linkedin) {
    const label = profile.linkedin.replace(/^https?:\/\//, '');
    out.push({
      key: 'li',
      html: `<a href="${escapeHtml(profile.linkedin)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${escapeHtml(label)}</a>`,
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
  const items = contactItems(profile);

  if (tpl === 'template2') {
    return `
      <div class="border-b border-gray-400 pb-4 mb-5 text-center">
        <h1 class="text-3xl font-bold text-gray-900 tracking-wide">${escapeHtml(profile.fullName)}</h1>
        <p class="text-base text-gray-600 mt-1 italic">${escapeHtml(jobTitle)}</p>
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
          <p class="text-sm font-semibold text-gray-600 tracking-wide uppercase">${escapeHtml(jobTitle)}</p>
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

  // template1
  return `
    <div class="border-b-2 border-gray-800 pb-4 mb-5">
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">${escapeHtml(profile.fullName)}</h1>
      <p class="text-base font-semibold text-blue-700 mt-0.5">${renderBoldHtml(jobTitle)}</p>
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
