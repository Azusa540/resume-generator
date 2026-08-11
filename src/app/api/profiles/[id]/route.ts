import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const profile = await Profile.findOneAndUpdate(
    { _id: id, userId: user.id },
    await req.json(),
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
