import { connectDb } from '@/database/connections/mongo';
import { logger } from '@/lib/logger';

const t = Date.now();
connectDb()
  .then(() => logger.info('Database connection warmed up', { ms: Date.now() - t }))
  .catch((e) => logger.warn('Database warm-up skipped (it will connect on the first request)', { error: e instanceof Error ? e.message : String(e) }));
