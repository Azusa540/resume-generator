import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import User from '@/models/User';

function adminOnly(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  return user;
}

// GET — list all users
export async function GET(req: NextRequest) {
  const auth = adminOnly(req);
  if (auth instanceof NextResponse) return auth;
  await connectDB();
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
  const withKeyStatus = users.map((u) => ({
    _id: u._id,
    username: u.username,
    is_admin: u.is_admin,
    is_premium: u.is_premium,
    createdAt: u.createdAt,
    hasApiKey: Boolean(u.apiKeyHash),
  }));
  return NextResponse.json(withKeyStatus);
}

// POST — create user
export async function POST(req: NextRequest) {
  const auth = adminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const { username, password, is_admin, is_premium } = await req.json();
  if (!username || !password)
    return NextResponse.json({ message: 'Username and password required.' }, { status: 400 });
  await connectDB();
  const exists = await User.findOne({ username });
  if (exists) return NextResponse.json({ message: 'Username already taken.' }, { status: 409 });
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    username,
    password: hashed,
    is_admin: is_admin ?? false,
    is_premium: is_premium ?? false,
  });
  return NextResponse.json(
    { _id: user._id, username: user.username, is_admin: user.is_admin, is_premium: user.is_premium },
    { status: 201 }
  );
}

// PATCH — update user (password, is_admin, and/or is_premium)
export async function PATCH(req: NextRequest) {
  const auth = adminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const { id, password, is_admin, is_premium } = await req.json();
  if (!id) return NextResponse.json({ message: 'User id required.' }, { status: 400 });
  await connectDB();
  const update: Record<string, unknown> = {};
  if (password) update.password = await bcrypt.hash(password, 12);
  if (is_admin !== undefined) update.is_admin = is_admin;
  if (is_premium !== undefined) update.is_premium = is_premium;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 });
  await User.findByIdAndUpdate(id, update);
  return NextResponse.json({ message: 'Updated.' });
}

// DELETE — delete user
export async function DELETE(req: NextRequest) {
  const auth = adminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'User id required.' }, { status: 400 });
  if (id === auth.id)
    return NextResponse.json({ message: 'Cannot delete your own account.' }, { status: 400 });
  await connectDB();
  await User.findByIdAndDelete(id);
  return NextResponse.json({ message: 'Deleted.' });
}
