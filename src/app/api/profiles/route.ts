import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).sort({ createdAt: -1 });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const profile = await Profile.create({ ...body, userId: user.id });
  return NextResponse.json(profile, { status: 201 });
}
