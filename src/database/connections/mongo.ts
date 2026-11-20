import mongoose from 'mongoose';
import { getEnv } from '@/config/env';

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (g.__mongoose ??= { conn: null, promise: null });

/** Cached connection (safe for serverless + HMR). All timestamps are stored in UTC by MongoDB. */
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    // NoSQL-injection defence: user input is parsed by Zod into primitives (strings/numbers) and
    // is never spread into filters. Repositories build filters explicitly from typed arguments.
    cache.promise = mongoose.connect(getEnv().MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}
