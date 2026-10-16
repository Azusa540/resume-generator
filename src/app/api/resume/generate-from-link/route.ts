import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Profile from '@/models/Profile';
import Resume from '@/models/Resume';
import User from '@/models/User';
import { scrapeJobLink, JobScrapeError } from '@/lib/jobScraper';
import { generateTailoredResume, ResumeGenerateError } from '@/lib/generateResume';
import { openResumeModel } from '@/lib/resumeModel';
import { resumeKey, uploadResume, getSignedDownloadUrl } from '@/lib/storage';
import { extractApiKey, findUserByApiKey } from '@/lib/apiKey';
import {
  buildResumeDocHtml,
  buildResumeFileName,
  type PdfTemplate,
} from '@/lib/resumeHtml';
import { pdfFromHtml, PdfBusyError } from '@/lib/pdfFromHtml';

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

  // X-API-Key only authenticates the caller. The profile owner's model and key are billed.
  const profileOwner = await User.findById(profile.userId, { is_admin: 1, anthropicApiKey: 1, openaiApiKey: 1, llmModel: 1 });
  const opened = openResumeModel(profileOwner, 'owner');
  if ('message' in opened) {
    return NextResponse.json({ message: opened.message }, { status: 400 });
  }

  let generated;
  try {
    generated = await generateTailoredResume({
      model: opened.model,
      profile,
      isAdmin: Boolean(profileOwner?.is_admin),
      title: scraped.jobTitle,
      company: scraped.companyName,
      jobDescription: scraped.jobDescription,
    });
  } catch (err) {
    if (err instanceof ResumeGenerateError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[generate-from-link] Unexpected failure:', jobLink, err);
    return NextResponse.json({ message: 'Failed to generate the resume.' }, { status: 500 });
  }

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
    console.error('[generate-from-link] PDF generation failed:', jobLink, err);
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
    console.error('[generate-from-link] Failed to store resume:', jobLink, err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
