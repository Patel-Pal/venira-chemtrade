/** Loads Razorpay Checkout lazily (only on the payment step). No secrets are used in the browser. */
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler: (r: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (r: { error: { description: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export async function openRazorpay(opts: Omit<RazorpayOptions, 'handler' | 'modal'>): Promise<
  { status: 'success'; response: RazorpayResponse } | { status: 'dismissed' } | { status: 'failed'; message: string }
> {
  await loadRazorpay();
  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      ...opts,
      handler: (response) => resolve({ status: 'success', response }),
      modal: { ondismiss: () => resolve({ status: 'dismissed' }), confirm_close: true },
    });
    rzp.on('payment.failed', (r) => resolve({ status: 'failed', message: r.error?.description ?? 'Payment failed' }));
    rzp.open();
  });
}
