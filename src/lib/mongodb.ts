import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-builder';

let cached = (global as typeof globalThis & { mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null } }).mongoose;

if (!cached) {
  (global as typeof globalThis & { mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null } }).mongoose = { conn: null, promise: null };
  cached = (global as typeof globalThis & { mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null } }).mongoose!;
}

export async function connectDB() {
  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI).then((m) => m.connection);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
