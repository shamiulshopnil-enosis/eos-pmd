import mongoose from "mongoose";

// Cached connection so Next.js hot-reload (dev) and serverless invocations
// (Vercel) reuse one pool instead of opening a socket per request.
const MONGODB_URI = process.env.MONGODB_URI;

const globalForMongoose = globalThis as unknown as {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cached = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env (local) and the Vercel project env vars.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
