/**
 * Builds a wa.me deep link. Accepts numbers as typed by an admin ("+91 86694 21221", "08669421221", "8669421221").
 * 10-digit Indian numbers get the 91 country code; anything longer is assumed to already include one.
 * Returns null when the value is not a plausible phone number.
 */
export function whatsappNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export function whatsappLink(raw: string | null | undefined, message?: string): string | null {
  const n = whatsappNumber(raw);
  if (!n) return null;
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
