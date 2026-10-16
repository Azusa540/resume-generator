import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const target = await User.findById(id, { openaiApiKey: 1 });
  if (!target) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  return NextResponse.json({ openaiApiKey: target.openaiApiKey ?? null });
}
