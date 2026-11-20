import Razorpay from 'razorpay';
import { getEnv } from '@/config/env';
import { AppError } from '@/lib/errors';
import { hmacSha256Hex, safeEqual } from '@/lib/security';

let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Online payments are not configured yet', 503, 'PAYMENTS_UNAVAILABLE');
  }
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  return safeEqual(hmacSha256Hex(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret). MUST use the raw body bytes. */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  return safeEqual(hmacSha256Hex(secret, rawBody), signature);
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrderResult> {
  const rzp = getRazorpay();
  const o = await rzp.orders.create({ amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes });
  return { id: o.id, amount: Number(o.amount), currency: o.currency };
}

export async function fetchRazorpayPayment(paymentId: string) {
  const p = await getRazorpay().payments.fetch(paymentId);
  return { id: p.id, orderId: p.order_id as string, amount: Number(p.amount), currency: p.currency, status: p.status as string, method: p.method as string | undefined };
}

export async function createRazorpayRefund(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  const r = await getRazorpay().payments.refund(paymentId, { amount: amountPaise, notes });
  return { id: r.id as string, status: r.status as string };
}
