/** Creates any missing MongoDB indexes: npm run db:indexes  (safe to re-run; never drops indexes). Run after deploys that add indexes. */
import { getRepos } from '../repositories';
import { ensureIndexes } from '../connections/mongo';

(async () => {
  await getRepos(); // loads every model
  const n = await ensureIndexes();
  console.log(`Indexes ensured for ${n} collections.`);
  process.exit(0);
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
