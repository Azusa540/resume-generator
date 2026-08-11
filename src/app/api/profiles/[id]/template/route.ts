import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'templates');

// POST /api/profiles/[id]/template — upload a .docx template
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const profile = await Profile.findOne({ _id: id, userId: user.id });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('template') as File | null;

  if (!file) return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
  if (!file.name.endsWith('.docx')) {
    return NextResponse.json({ message: 'Only .docx files are accepted.' }, { status: 400 });
  }

  // Delete previous file from disk if any
  if (profile.templatePath) {
    await fs.unlink(profile.templatePath).catch(() => null);
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.docx`;
  const dest = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));

  await Profile.findOneAndUpdate(
    { _id: id, userId: user.id },
    { $set: { templatePath: dest, templateName: file.name } },
    { strict: false }
  );

  return NextResponse.json({ templateName: file.name });
}

// DELETE /api/profiles/[id]/template — remove template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const profile = await Profile.findOne({ _id: id, userId: user.id });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });

  if (profile.templatePath) {
    await fs.unlink(profile.templatePath).catch(() => null);
  }

  await Profile.findOneAndUpdate(
    { _id: id, userId: user.id },
    { $unset: { templatePath: '', templateName: '' } },
    { strict: false }
  );

  return NextResponse.json({ message: 'Template removed.' });
}
