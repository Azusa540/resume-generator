import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const doc = await User.findById(user.id, { anthropicApiKey: 1 });
  return NextResponse.json({ hasAnthropicKey: Boolean(doc?.anthropicApiKey) });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return NextResponse.json({ message: 'apiKey is required.' }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(user.id, { anthropicApiKey: apiKey.trim() });

  return NextResponse.json({ message: 'Claude API key saved.' });
}
