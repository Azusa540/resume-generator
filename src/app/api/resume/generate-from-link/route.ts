import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import { connectDB } from '@/lib/mongodb';
import Profile from '@/models/Profile';
import Resume from '@/models/Resume';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { scrapeJobLink, JobScrapeError } from '@/lib/jobScraper';
import { resumeKey, uploadResume, getSignedDownloadUrl } from '@/lib/storage';
import { extractApiKey, findUserByApiKey } from '@/lib/apiKey';
import type { GeneratedResume, SkillCategories } from '@/types/resume';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_CONCURRENT = 3;
let active = 0;

export async function POST(req: NextRequest) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Missing API key. Send X-API-Key header or Authorization: Bearer <key>.' },
      { status: 401 }
    );
  }

  const { profileId, jobLink } = await req.json();
  if (!profileId || !jobLink) {
    return NextResponse.json({ message: 'Missing required fields: profileId, jobLink.' }, { status: 400 });
  }

  await connectDB();
  const user = await findUserByApiKey(apiKey);
  if (!user) {
    return NextResponse.json({ message: 'Invalid API key.' }, { status: 401 });
  }
  const userId = String(user._id);

  let scraped;
  try {
    scraped = await scrapeJobLink(jobLink);
  } catch (err) {
    if (err instanceof JobScrapeError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json({ message: 'Failed to scrape the job link.' }, { status: 502 });
  }

  const profile = await Profile.findOne({ _id: profileId, userId });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

  const systemPrompt = profile.profileType === 'other'
    ? buildSystemPromptNonSoftware()
    : buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    profile,
    scraped.jobTitle,
    scraped.companyName,
    scraped.jobDescription,
    profile.customPrompt,
    profile.profileType
  );

  let message;
  try {
    message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      },
      { timeout: 120_000 }
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const errorMessage =
      status === 429
        ? 'The AI service is rate-limited right now. Please wait a moment and try again.'
        : status === 401
        ? 'AI service authentication failed. Check the ANTHROPIC_API_KEY configuration.'
        : 'The AI service timed out or is unavailable. Please try again.';
    console.error('Anthropic generate failed:', err);
    return NextResponse.json({ message: errorMessage }, { status: 502 });
  }

  if (message.stop_reason === 'max_tokens') {
    return NextResponse.json(
      { message: 'The resume was too long to finish generating. Try a shorter job description.' },
      { status: 502 }
    );
  }

  const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const jsonEnd = stripped.lastIndexOf('}');
  const raw = jsonEnd !== -1 ? stripped.slice(0, jsonEnd + 1) : stripped;

  let generated: GeneratedResume;
  try {
    generated = JSON.parse(raw) as GeneratedResume;
  } catch {
    return NextResponse.json(
      { message: 'Failed to parse response as JSON.', raw: rawText },
      { status: 500 }
    );
  }

  const fileName = generated.resume_file_name.replace(/[^a-zA-Z0-9_\-() ]/g, '') || 'resume';
  const html = wrapPage(
    buildResumeHtml(generated, {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      linkedin: profile.linkedin,
    })
  );

  if (active >= MAX_CONCURRENT) {
    return NextResponse.json({ message: 'Server busy, please try again in a moment.' }, { status: 503 });
  }
  active++;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const tab = await browser.newPage();
    await tab.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pdf = await tab.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '0', bottom: '20mm', left: '0' },
    });

    const pdfBuffer = Buffer.from(pdf);
    const key = resumeKey(userId, profileId, fileName);
    await uploadResume(key, pdfBuffer);
    await Resume.create({
      userId,
      profileId,
      fileName,
      s3Key: key,
    });

    const resumeDownloadLink = await getSignedDownloadUrl(key);

    return NextResponse.json({
      company: scraped.companyName,
      jobTitle: scraped.jobTitle,
      fileName,
      resumeDownloadLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ message: msg }, { status: 500 });
  } finally {
    active--;
    await browser?.close();
  }
}

// ─── HTML rendering (server-side, no browser DOM available) ─────────────────

interface ProfileContact {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  linkedin?: string;
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

function wrapPage(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>body { margin: 0; padding: 0; background: #fff; }</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function buildResumeHtml(generated: GeneratedResume, profile: ProfileContact): string {
  const contacts = [profile.email, profile.phone, profile.address].filter(Boolean) as string[];
  const contactsHtml = [
    ...contacts.map((c) => `<span>${escapeHtml(c)}</span>`),
    ...(profile.linkedin
      ? [`<a href="${escapeHtml(profile.linkedin)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(profile.linkedin.replace(/^https?:\/\//, ''))}</a>`]
      : []),
  ].join('<span style="margin:0 8px;color:#d1d5db;">&middot;</span>');

  const skillsHtml = Array.isArray(generated.skills)
    ? `<span style="font-weight:600;color:#1f2937;">${escapeHtml((generated.skills as unknown as string[]).join(', '))}</span>`
    : Object.entries(generated.skills as SkillCategories)
        .filter(([, items]) => Array.isArray(items) && items.length > 0)
        .map(
          ([category, items]) =>
            `<div style="font-size:14px;color:#1f2937;line-height:1.4;"><strong>${escapeHtml(category)}</strong>: ${escapeHtml(items.join(', '))}</div>`
        )
        .join('');

  const experienceHtml = generated.experience_bullets
    .map(
      (exp) => `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(exp.company)}</span>
          ${exp.period ? `<span style="font-size:12px;color:#6b7280;margin-left:16px;">${escapeHtml(exp.period)}</span>` : ''}
        </div>
        <p style="font-size:14px;color:#1d4ed8;font-weight:500;margin:0 0 6px 0;">${escapeHtml(exp.job_title)}</p>
        <ul style="margin:0;padding:0;list-style:none;">
          ${exp.bullets
            .map(
              (b) =>
                `<li style="font-size:14px;color:#374151;line-height:1.6;display:flex;gap:8px;margin-bottom:4px;"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#9ca3af;flex-shrink:0;display:inline-block;"></span><span>${renderBoldHtml(b)}</span></li>`
            )
            .join('')}
        </ul>
      </div>`
    )
    .join('');

  const educationHtml = generated.education
    .map(
      (edu) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(edu.university)}</span>
          <span style="font-size:12px;color:#6b7280;margin-left:16px;">${escapeHtml(edu.period)}</span>
        </div>
        <p style="font-size:14px;color:#4b5563;margin:0;">${escapeHtml(edu.degree)}</p>
      </div>`
    )
    .join('');

  return `
    <div style="max-width:820px;margin:0 auto;background:#fff;padding:48px 56px;font-family:Inter, sans-serif;">
      <div style="border-bottom:2px solid #1f2937;padding-bottom:16px;margin-bottom:20px;">
        <h1 style="font-size:30px;font-weight:700;color:#111827;margin:0;">${escapeHtml(profile.fullName)}</h1>
        <p style="font-size:16px;font-weight:600;color:#1d4ed8;margin:2px 0 0 0;">${renderBoldHtml(generated.target_job_title)}</p>
        <div style="margin-top:8px;font-size:14px;color:#4b5563;">${contactsHtml}</div>
      </div>

      <div style="margin-bottom:20px;break-inside:avoid;">
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">Professional Summary</h2>
        <p style="font-size:14px;color:#374151;line-height:1.6;">${renderBoldHtml(generated.professional_summary)}</p>
      </div>

      <div style="margin-bottom:20px;break-inside:avoid;">
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">Skills</h2>
        <div style="display:flex;flex-direction:column;gap:4px;">${skillsHtml}</div>
      </div>

      ${
        generated.experience_bullets.length > 0
          ? `<div style="margin-bottom:20px;">
              <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">Experience</h2>
              ${experienceHtml}
            </div>`
          : ''
      }

      ${
        generated.education.length > 0
          ? `<div style="margin-bottom:20px;break-inside:avoid;">
              <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:0 0 8px 0;">Education</h2>
              ${educationHtml}
            </div>`
          : ''
      }
    </div>`;
}
