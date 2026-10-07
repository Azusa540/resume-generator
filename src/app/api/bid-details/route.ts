import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import BidDetail from '@/models/BidDetail';
// Side-effect import: ensures the Profile model is registered for populate() below.
import '@/models/Profile';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { profileId, jobTitle, company, jobLink, jobDescription } = await req.json();
  if (!jobTitle || !company) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }

  await connectDB();
  const bid = await BidDetail.create({
    userId: user.id,
    profileId: profileId || undefined,
    jobTitle,
    company,
    jobLink: jobLink || undefined,
    jobDescription: jobDescription || undefined,
  });

  return NextResponse.json(bid, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  await connectDB();
  const bids = await BidDetail.find({ userId: user.id })
    .populate('profileId', 'fullName')
    .sort({ createdAt: -1 });
  return NextResponse.json(bids);
}
