import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';
import { DEFAULT_LLM_MODEL, isKnownLlmModel } from '@/lib/llmModels';

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const doc = await User.findById(user.id, { llmModel: 1 });
  return NextResponse.json({ llmModel: doc?.llmModel || DEFAULT_LLM_MODEL });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { llmModel } = await req.json();
  if (!isKnownLlmModel(llmModel)) {
    return NextResponse.json({ message: 'Unknown model.' }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(user.id, { llmModel });
  return NextResponse.json({ llmModel });
}
