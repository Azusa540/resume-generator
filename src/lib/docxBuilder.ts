import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { GeneratedResume } from '@/types/resume';

interface ProfileInfo {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  linkedin?: string;
}

// ─── XML split-run repair ────────────────────────────────────────────────────
// When users create templates in Word, {tag} is often split across multiple
// XML runs, e.g.:  <w:t>{</w:t></w:r><w:r><w:t>name</w:t></w:r><w:r><w:t>}</w:t>
// This state machine merges such splits so docxtemplater sees clean {tag} tokens.
function fixSplitTags(xml: string): string {
  let result = '';
  let i = 0;
  let inTemplate = false;
  let templateContent = '';

  while (i < xml.length) {
    if (xml[i] === '<') {
      // Consume the full XML tag as a unit
      const end = xml.indexOf('>', i);
      if (end === -1) { result += xml[i++]; continue; }
      const tag = xml.substring(i, end + 1);
      if (!inTemplate) result += tag;  // skip XML tags mid-template-tag
      i = end + 1;
    } else if (xml[i] === '{') {
      inTemplate = true;
      templateContent = '{';
      i++;
    } else if (xml[i] === '}' && inTemplate) {
      inTemplate = false;
      result += templateContent + '}';
      templateContent = '';
      i++;
    } else {
      if (inTemplate) templateContent += xml[i];
      else result += xml[i];
      i++;
    }
  }

  // If we hit the end while still inside a tag, emit as-is (not a real template tag)
  if (inTemplate) result += templateContent;

  return result;
}

// Apply the fix to every XML part that may contain template tags
function repairTemplate(zip: PizZip): void {
  const xmlFiles = zip.filter((relativePath: string) =>
    relativePath.endsWith('.xml') && relativePath.startsWith('word/')
  );
  for (const file of xmlFiles) {
    try {
      const fixed = fixSplitTags(file.asText());
      zip.file(file.name, fixed);
    } catch {
      // leave untouched if parsing fails
    }
  }
}

// ─── template variables ───────────────────────────────────────────────────────

export function buildTemplateVariables(
  profile: ProfileInfo,
  generated: GeneratedResume,
  company: string
): Record<string, unknown> {
  return {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    linkedin: profile.linkedin ?? '',
    professional_summary: generated.professional_summary.replace(/\*\*(.*?)\*\*/g, '$1'),
    target_job_title: generated.target_job_title,
    target_company: company,
    skills: Object.values(generated.skills).flat().join(', '),

    education: generated.education.map((e) => ({
      edu_university: e.university,
      edu_degree: e.degree,
      edu_period: e.period,
    })),

    experiences: generated.experience_bullets.map((exp) => ({
      exp_company: exp.company,
      exp_job_title: exp.job_title,
      exp_period: exp.period ?? '',
      exp_bullets: exp.bullets.map((b) => ({
        bullet: b.replace(/\*\*(.*?)\*\*/g, '$1'),
      })),
    })),
  };
}

// ─── render ───────────────────────────────────────────────────────────────────

export function renderDocx(
  templateBuffer: Buffer,
  variables: Record<string, unknown>
): Buffer {
  const zip = new PizZip(templateBuffer);

  // Fix any split-run template tags before handing off to docxtemplater
  repairTemplate(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: false,
    nullGetter: () => '',
  });

  try {
    doc.render(variables);
  } catch (err: unknown) {
    // Extract detailed error list from docxtemplater's multi-error wrapper.
    // docxtemplater attaches errors to `err.properties.errors` — access via any
    // because the property may live on the prototype rather than as an own property.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    const subErrors: unknown[] = anyErr?.properties?.errors ?? [];
    if (subErrors.length > 0) {
      const details = subErrors
        .map((e: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ae = e as any;
          const msg = ae?.message ?? String(e);
          const tag = ae?.properties?.id ?? ae?.id ?? '';
          return tag ? `[${tag}] ${msg}` : msg;
        })
        .join('; ');
      console.error('[docxBuilder] template render errors:', details);
      throw new Error(details);
    }
    // Not a multi-error — re-throw as-is with message
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[docxBuilder] template render error:', msg);
    throw new Error(msg);
  }

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}
