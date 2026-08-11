import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// One-time endpoint to seed the admin account.
// Remove or protect this route after first use.
export async function POST() {
  await connectDB();

  const existing = await User.findOne({ username: 'adminas' });
  if (existing) {
    return NextResponse.json({ message: 'Admin already exists.' }, { status: 409 });
  }

  await User.createWithHashedPassword('adminas', 'strong123!@#');

  return NextResponse.json({ message: 'Admin account created.' }, { status: 201 });
}
