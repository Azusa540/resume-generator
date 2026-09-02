import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';

type Params = { params: Promise<{ id: string }> };

// GET — reveal a user's stored Claude API key (admin only, fetched on demand
// so the raw key never rides along with the bulk user list response).
export async function GET(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const target = await User.findById(id, { anthropicApiKey: 1 });
  if (!target) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  return NextResponse.json({ anthropicApiKey: target.anthropicApiKey ?? null });
}
