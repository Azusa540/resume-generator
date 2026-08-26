import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import Profile from '@/models/Profile';
import Resume from '@/models/Resume';
import User from '@/models/User';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { buildSystemPromptAdmin } from '@/lib/adminPrompt';
import { scrapeJobLink, JobScrapeError } from '@/lib/jobScraper';
import { repairPrimaryStackCoverage } from '@/lib/resumeRepair';
import { resumeKey, uploadResume, getSignedDownloadUrl } from '@/lib/storage';
import { extractApiKey, findUserByApiKey } from '@/lib/apiKey';
import {
  buildResumeDocHtml,
  buildResumeFileName,
  type PdfTemplate,
} from '@/lib/resumeHtml';
import { pdfFromHtml, PdfBusyError } from '@/lib/pdfFromHtml';
import type { GeneratedResume } from '@/types/resume';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  // Any valid API key can target any profile, regardless of which account owns it.
  const profile = await Profile.findOne({ _id: profileId });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

  // Admin-owned profiles get a dedicated prompt, overriding the software/other split.
  const profileOwner = await User.findById(profile.userId, { is_admin: 1 });
  const systemPrompt = profileOwner?.is_admin
    ? buildSystemPromptAdmin()
    : profile.profileType === 'other'
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

  generated = await repairPrimaryStackCoverage(client, systemPrompt, userPrompt, raw, generated);

  const profileContact = {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    linkedin: profile.linkedin,
  };

  const tpl = (profile.pdfTemplate ?? 'template1') as PdfTemplate;
  const fileName = buildResumeFileName(
    profile.fullName,
    generated.target_job_title,
    scraped.companyName
  ) || 'resume';

  const html = buildResumeDocHtml(generated, profileContact, tpl);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await pdfFromHtml(html);
  } catch (err) {
    if (err instanceof PdfBusyError) {
      return NextResponse.json({ message: err.message }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  try {
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
    const msg = err instanceof Error ? err.message : 'Failed to store resume';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
