import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';
import User from '@/models/User';
import { generateTailoredResume, ResumeGenerateError } from '@/lib/generateResume';
import { openResumeModel } from '@/lib/resumeModel';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { profileId, title, company, jobDescription } = await req.json();
  if (!profileId || !title || !company || !jobDescription) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }

  await connectDB();
  const [profile, dbUser] = await Promise.all([
    Profile.findOne({ _id: profileId, userId: user.id }),
    User.findById(user.id, { anthropicApiKey: 1, openaiApiKey: 1, llmModel: 1 }),
  ]);
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  if (profile.employment.length === 0) {
    return NextResponse.json(
      { message: 'This profile has no work experience yet. Add at least one job before generating a resume.' },
      { status: 400 }
    );
  }
  const opened = openResumeModel(dbUser, 'account');
  if ('message' in opened) {
    return NextResponse.json({ message: opened.message }, { status: 400 });
  }

  try {
    const generated = await generateTailoredResume({
      model: opened.model,
      profile,
      isAdmin: user.isAdmin,
      title,
      company,
      jobDescription,
    });
    return NextResponse.json({
      generated,
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        linkedin: profile.linkedin,
      },
      pdfTemplate: profile.pdfTemplate ?? 'template1',
    });
  } catch (err) {
    if (err instanceof ResumeGenerateError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[generate] Unexpected failure:', err);
    return NextResponse.json({ message: 'Failed to generate the resume.' }, { status: 500 });
  }
}
