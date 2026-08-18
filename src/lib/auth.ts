import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export interface AuthPayload {
  id: string;
  username: string;
  isAdmin: boolean;
  isPremium: boolean;
}

export function getUser(req: NextRequest): AuthPayload | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
