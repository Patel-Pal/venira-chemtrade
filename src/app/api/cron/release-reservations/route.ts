import { NextResponse, type NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { safeEqual } from '@/lib/security';
import { releaseExpiredReservations } from '@/modules/orders/checkout.service';
import { getRepos } from '@/database/repositories';

export const dynamic = 'force-dynamic';

/** Scheduled job (e.g. Vercel Cron every 5 min). Protected by a shared secret. */
export async function GET(req: NextRequest) {
  const secret = getEnv().CRON_SECRET;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await getRepos();
  const released = await releaseExpiredReservations(200);
  return NextResponse.json({ released });
}
