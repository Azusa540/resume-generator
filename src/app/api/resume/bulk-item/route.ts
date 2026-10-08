import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';
import User from '@/models/User';
import { scrapeJobLink, JobScrapeError } from '@/lib/jobScraper';
import { generateTailoredResume, ResumeGenerateError } from '@/lib/generateResume';
import { buildResumeDocHtml, buildResumeFileName, type PdfTemplate } from '@/lib/resumeHtml';
import { pdfFromHtml, PdfBusyError } from '@/lib/pdfFromHtml';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const body = await req.json();
  const profileId = String(body.profileId ?? '');
  const jobLink = typeof body.jobLink === 'string' ? body.jobLink.trim() : '';

  let title = typeof body.title === 'string' ? body.title.trim() : '';
  let company = typeof body.company === 'string' ? body.company.trim() : '';
  let jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';

  if (!profileId || (!jobLink && (!title || !company || !jobDescription))) {
    return NextResponse.json(
      { message: 'Send profileId with either jobLink or title, company, and jobDescription.' },
      { status: 400 }
    );
  }
  if (jobLink && /linkedin\.com/i.test(jobLink)) {
    return NextResponse.json({ message: 'not available to generate the resume' }, { status: 400 });
  }

  await connectDB();
  const [profile, dbUser] = await Promise.all([
    Profile.findOne({ _id: profileId, userId: user.id }),
    User.findById(user.id, { anthropicApiKey: 1 }),
  ]);
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  if (profile.employment.length === 0) {
    return NextResponse.json(
      { message: 'This profile has no work experience yet. Add at least one job before generating a resume.' },
      { status: 400 }
    );
  }
  if (!dbUser?.anthropicApiKey) {
    return NextResponse.json(
      { message: 'No Claude API key configured for your account. Ask an admin to set one.' },
      { status: 400 }
    );
  }

  if (jobLink) {
    try {
      const scraped = await scrapeJobLink(jobLink);
      title = scraped.jobTitle;
      company = scraped.companyName;
      jobDescription = scraped.jobDescription;
    } catch (err) {
      if (err instanceof JobScrapeError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      console.error('[bulk-item] Job scrape failed:', jobLink, err);
      return NextResponse.json({ message: 'Failed to scrape the job link.' }, { status: 502 });
    }
  }

  const client = new Anthropic({ apiKey: dbUser.anthropicApiKey });
  try {
    const generated = await generateTailoredResume({
      client,
      profile,
      isAdmin: user.isAdmin,
      title,
      company,
      jobDescription,
    });
    const fileName = buildResumeFileName(profile.fullName, generated.target_job_title, company) || 'resume';
    const html = buildResumeDocHtml(
      generated,
      {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        linkedin: profile.linkedin,
      },
      (profile.pdfTemplate ?? 'template1') as PdfTemplate
    );
    const pdf = await pdfFromHtml(html);
    return NextResponse.json({
      company,
      jobTitle: title,
      fileName,
      pdfBase64: pdf.toString('base64'),
    });
  } catch (err) {
    if (err instanceof ResumeGenerateError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    if (err instanceof PdfBusyError) {
      return NextResponse.json({ message: err.message }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : 'Failed to generate the resume.';
    console.error('[bulk-item] Generation failed:', err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
