import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import Profile from '@/models/Profile';
import Resume from '@/models/Resume';
import User from '@/models/User';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { buildSystemPromptAdmin } from '@/lib/adminPrompt';
import { buildSystemPromptAdminNonSoftware } from '@/lib/adminPromptNonSoftware';
import { scrapeJobLink, JobScrapeError } from '@/lib/jobScraper';
import { repairPrimaryStackCoverage, repairPositionZeroBulletCount } from '@/lib/resumeRepair';
import { reviewAuthenticity } from '@/lib/authenticityReview';
import { buildResumeTool, extractGeneratedResume } from '@/lib/resumeSchema';
import { resumeKey, uploadResume, getSignedDownloadUrl } from '@/lib/storage';
import { extractApiKey, findUserByApiKey } from '@/lib/apiKey';
import {
  buildResumeDocHtml,
  buildResumeFileName,
  type PdfTemplate,
} from '@/lib/resumeHtml';
import { pdfFromHtml, PdfBusyError } from '@/lib/pdfFromHtml';
import type { GeneratedResume } from '@/types/resume';

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
  if (/linkedin\.com/i.test(jobLink)) {
    return NextResponse.json({ message: 'not available to generate the resume' }, { status: 400 });
  }

  await connectDB();
  const user = await findUserByApiKey(apiKey);
  if (!user) {
    return NextResponse.json({ message: 'Invalid API key.' }, { status: 401 });
  }
  if (!user.anthropicApiKey) {
    return NextResponse.json(
      { message: 'No Claude API key configured for this account. Ask an admin to set one.' },
      { status: 400 }
    );
  }
  const client = new Anthropic({ apiKey: user.anthropicApiKey });
  const userId = String(user._id);

  let scraped;
  try {
    scraped = await scrapeJobLink(jobLink);
  } catch (err) {
    if (err instanceof JobScrapeError) {
      console.error('[generate-from-link] Job scrape failed:', jobLink, err.status, err.message);
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[generate-from-link] Job scrape failed unexpectedly:', jobLink, err);
    return NextResponse.json({ message: 'Failed to scrape the job link.' }, { status: 502 });
  }

  // Any valid API key can target any profile, regardless of which account owns it.
  const profile = await Profile.findOne({ _id: profileId });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  if (profile.employment.length === 0) {
    return NextResponse.json(
      { message: 'This profile has no work experience yet. Add at least one job before generating a resume.' },
      { status: 400 }
    );
  }

  // Admin-owned profiles get a dedicated prompt, overriding the software/other split.
  const profileOwner = await User.findById(profile.userId, { is_admin: 1 });
  const isAdmin = Boolean(profileOwner?.is_admin);
  const systemPrompt = isAdmin
    ? profile.profileType === 'other'
      ? buildSystemPromptAdminNonSoftware()
      : buildSystemPromptAdmin()
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
  const tool = buildResumeTool(profile.profileType, isAdmin);

  let message;
  try {
    message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: userPrompt },
        ],
      },
      { timeout: 120_000 }
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const anthropicMessage =
      (err as { error?: { error?: { message?: string } } })?.error?.error?.message || '';
    const errorMessage = /credit balance/i.test(anthropicMessage)
      ? 'This account has run out of Claude API credits. Ask an admin to add credits or set a different key in Settings.'
      : status === 429
      ? 'The AI service is rate-limited right now. Please wait a moment and try again.'
      : status === 401
      ? 'AI service authentication failed. Your Claude API key may be invalid — ask an admin to check it.'
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

  let generated: GeneratedResume;
  let toolUse: Anthropic.ToolUseBlock;
  try {
    ({ generated, toolUse } = extractGeneratedResume(message, profile.profileType));
  } catch (err) {
    console.error('[generate-from-link] Failed to extract/validate resume tool output:', err, {
      profileFullName: profile.fullName,
      employmentCount: profile.employment.length,
      jobLink,
      scrapedTitle: scraped.jobTitle,
      scrapedCompany: scraped.companyName,
      scrapedDescriptionLen: scraped.jobDescription.length,
      stopReason: message.stop_reason,
      rawContent: JSON.stringify(message.content),
    });
    return NextResponse.json({ message: 'Failed to parse response as JSON.' }, { status: 500 });
  }

  ({ generated, toolUse } = await repairPrimaryStackCoverage(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  if (isAdmin && profile.profileType !== 'other') {
    ({ generated, toolUse } = await repairPositionZeroBulletCount(
      client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
    ));
  }
  ({ generated } = await reviewAuthenticity(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));

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
    console.error('[generate-from-link] PDF generation failed:', err);
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
    console.error('[generate-from-link] Failed to store resume:', err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
