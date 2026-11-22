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
    const env = getEnv();
    // Index sync on every start costs ~2.5s of competing round trips; in production indexes are created by `npm run db:indexes`.
    const autoIndex = env.DB_AUTO_INDEX ? env.DB_AUTO_INDEX === 'true' : env.NODE_ENV !== 'production';
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      bufferCommands: false,
      autoIndex,
      // Keep a few connections open so requests never wait for a TLS handshake (~0.5s each) to Atlas.
      minPoolSize: env.DB_MIN_POOL_SIZE,
      maxPoolSize: 10,
      maxIdleTimeMS: 5 * 60_000,
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

/** Creates any missing indexes (idempotent; never drops anything). Used by `npm run db:indexes` and the seed. */
export async function ensureIndexes(): Promise<number> {
  await connectDb();
  const models = Object.values(mongoose.models);
  await Promise.all(models.map((m) => m.createIndexes()));
  return models.length;
}
