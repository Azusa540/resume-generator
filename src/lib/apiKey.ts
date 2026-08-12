import crypto from 'crypto';
import { NextRequest } from 'next/server';
import User, { IUser } from '@/models/User';

const API_KEY_PREFIX = 'rb_';

export function generateApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('base64url');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function extractApiKey(req: NextRequest): string | null {
  const header = req.headers.get('x-api-key')?.trim();
  if (header) return header;

  const auth = req.headers.get('authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function findUserByApiKey(key: string): Promise<IUser | null> {
  if (!key.startsWith(API_KEY_PREFIX)) return null;
  const hash = hashApiKey(key);
  return User.findOne({ apiKeyHash: hash });
}
