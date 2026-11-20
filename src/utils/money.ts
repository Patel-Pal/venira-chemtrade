/**
 * Money strategy: all amounts are INTEGERS in minor units (paise for INR).
 * Never use floating point for stored or calculated money.
 */
export const CURRENCY = 'INR';

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaise(paise: number | null | undefined, currency = CURRENCY): string {
  if (paise === null || paise === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(paise / 100);
}

/** Percentage of an integer amount, rounded half-up to the nearest paisa. */
export function percentOf(amountPaise: number, percent: number): number {
  return Math.round((amountPaise * percent) / 100);
}
