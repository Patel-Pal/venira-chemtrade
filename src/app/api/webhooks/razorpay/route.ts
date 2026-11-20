import { NextResponse, type NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';
import { verifyWebhookSignature } from '@/services/razorpay';
import { handleWebhookEvent } from '@/modules/payments/payment.service';
import { getRepos } from '@/database/repositories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook. Signature is computed over the RAW body, so we read text() BEFORE any JSON parsing.
 * Duplicate deliveries are ignored via the unique x-razorpay-event-id; failures return 5xx so Razorpay retries.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 512_000) return NextResponse.json({ error: 'too large' }, { status: 413 });
  const secret = getEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'), secret)) {
    logger.warn('Rejected webhook with invalid signature');
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  const eventId = req.headers.get('x-razorpay-event-id');
  if (!eventId) return NextResponse.json({ error: 'missing event id' }, { status: 400 });
  try {
    await getRepos();
    const outcome = await handleWebhookEvent(eventId, JSON.parse(raw));
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    logger.error('Webhook handler error', { error: String(e) });
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
