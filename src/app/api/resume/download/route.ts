import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';
import { buildTemplateVariables, renderDocx } from '@/lib/docxBuilder';
import type { GeneratedResume } from '@/types/resume';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { profileId, generated, company } = (await req.json()) as {
    profileId: string;
    generated: GeneratedResume;
    company: string;
  };

  if (!profileId || !generated || !company) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({ _id: profileId, userId: user.id });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

  if (!profile.templatePath) {
    return NextResponse.json(
      { message: 'No template attached to this profile. Upload a .docx template first.' },
      { status: 400 }
    );
  }

  let templateBuffer: Buffer;
  try {
    templateBuffer = await fs.readFile(profile.templatePath);
  } catch {
    return NextResponse.json({ message: 'Template file not found on server.' }, { status: 500 });
  }

  const variables = buildTemplateVariables(
    {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      linkedin: profile.linkedin,
    },
    generated,
    company
  );

  let docxBuffer: Buffer;
  try {
    docxBuffer = renderDocx(templateBuffer, variables);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[download] renderDocx failed:', msg);
    return NextResponse.json({ message: `Failed to render template: ${msg}` }, { status: 500 });
  }

  const filename = `${generated.resume_file_name.replace(/[^a-zA-Z0-9_\-() ]/g, '')}.docx`;

  return new NextResponse(docxBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
