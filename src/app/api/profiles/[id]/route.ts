import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { isPremiumTemplate } from '@/lib/resumeHtml';
import Profile from '@/models/Profile';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  if (body.pdfTemplate && isPremiumTemplate(body.pdfTemplate) && !user.isAdmin && !user.isPremium) {
    const existing = await Profile.findOne({ _id: id, userId: user.id }, { pdfTemplate: 1 });
    // Only block if this actually changes the template — don't punish saving an
    // unrelated field on a profile that already had a premium template applied
    // (e.g. an admin granted it, then premium was later revoked).
    if (existing?.pdfTemplate !== body.pdfTemplate) {
      return NextResponse.json({ message: 'That PDF template requires a premium account.' }, { status: 403 });
    }
  }

  const profile = await Profile.findOneAndUpdate(
    { _id: id, userId: user.id },
    body,
    { new: true, runValidators: true }
  );

  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  return NextResponse.json(profile);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const profile = await Profile.findOneAndDelete({ _id: id, userId: user.id });
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  return NextResponse.json({ message: 'Deleted.' });
}
