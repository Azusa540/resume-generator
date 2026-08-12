import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';
import { generateApiKey, hashApiKey } from '@/lib/apiKey';

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const doc = await User.findById(user.id, { apiKeyHash: 1 });
  return NextResponse.json({ hasApiKey: Boolean(doc?.apiKeyHash) });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const apiKey = generateApiKey();
  await User.findByIdAndUpdate(user.id, { apiKeyHash: hashApiKey(apiKey) });

  return NextResponse.json({
    apiKey,
    message: 'Save this key now — it will not be shown again. Regenerating invalidates the previous key.',
  });
}
