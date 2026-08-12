import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';
import { generateApiKey, hashApiKey } from '@/lib/apiKey';

export async function POST(req: NextRequest) {
  const auth = getUser(req);
  if (!auth) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ message: 'userId required.' }, { status: 400 });

  await connectDB();
  const target = await User.findById(userId);
  if (!target) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  const apiKey = generateApiKey();
  await User.findByIdAndUpdate(userId, { apiKeyHash: hashApiKey(apiKey) });

  return NextResponse.json({
    userId,
    username: target.username,
    apiKey,
    message: 'Save this key now — it will not be shown again. Regenerating invalidates the previous key.',
  });
}
