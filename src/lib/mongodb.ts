import mongoose from 'mongoose';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI. Set it in .env (MongoDB Atlas connection string).');
  }
  return uri;
}

let cached = (global as typeof globalThis & {
  mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}).mongoose;

if (!cached) {
  (global as typeof globalThis & {
    mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
  }).mongoose = { conn: null, promise: null };
  cached = (global as typeof globalThis & {
    mongoose?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
  }).mongoose!;
}

export async function connectDB() {
  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    const uri = getMongoUri();
    cached!.promise = mongoose.connect(uri).then((m) => m.connection);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
