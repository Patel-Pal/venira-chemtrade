/** Only same-site relative paths are accepted as post-login redirects (prevents open redirects). */
export function safeNext(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\') || /^\/[a-z]+:/i.test(target)) return fallback;
  return target;
}
