import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Resume from '@/models/Resume';
import { downloadResume } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const resume = await Resume.findOne({ _id: id, userId: user.id });
  if (!resume) return NextResponse.json({ message: 'Resume not found.' }, { status: 404 });

  let pdf: Buffer;
  try {
    pdf = await downloadResume(resume.s3Key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch resume from storage';
    return NextResponse.json({ message: msg }, { status: 502 });
  }

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resume.fileName}.pdf"`,
    },
  });
}
