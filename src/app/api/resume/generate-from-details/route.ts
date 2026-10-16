import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Profile from '@/models/Profile';
import Resume from '@/models/Resume';
import User from '@/models/User';
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

// Same generation pipeline as generate-from-link, but the caller already has
// the job details (company name, title, description) in hand — no scraping
// step, no job link at all. Used when the job details come from somewhere
// other than a scrapeable URL (e.g. pasted or entered directly upstream).
export async function POST(req: NextRequest) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Missing API key. Send X-API-Key header or Authorization: Bearer <key>.' },
      { status: 401 }
    );
  }

  const { profileId, companyName, jobTitle, jobDescription } = await req.json();
  if (!profileId || !companyName || !jobTitle || !jobDescription) {
    return NextResponse.json(
      { message: 'Missing required fields: profileId, companyName, jobTitle, jobDescription.' },
      { status: 400 }
    );
  }
  if (String(jobTitle).trim().length < 2 || String(companyName).trim().length < 2 || String(jobDescription).trim().length < 50) {
    return NextResponse.json(
      { message: 'companyName/jobTitle must be non-empty and jobDescription must be at least 50 characters.' },
      { status: 422 }
    );
  }

  await connectDB();
  const user = await findUserByApiKey(apiKey);
  if (!user) {
    return NextResponse.json({ message: 'Invalid API key.' }, { status: 401 });
  }
  const userId = String(user._id);

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
      title: jobTitle,
      company: companyName,
      jobDescription,
    });
  } catch (err) {
    if (err instanceof ResumeGenerateError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[generate-from-details] Unexpected failure:', err);
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
    companyName
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
    console.error('[generate-from-details] PDF generation failed:', { companyName, jobTitle }, err);
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
      company: companyName,
      jobTitle,
      fileName,
      resumeDownloadLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to store resume';
    console.error('[generate-from-details] Failed to store resume:', { companyName, jobTitle }, err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
