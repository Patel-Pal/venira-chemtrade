import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';
import { STAFF_ROLE_KEYS } from '@/constants/permissions';

/**
 * Cheap edge gate for page navigation only (signature + role claim).
 * REAL authorization (revocation, blocked users, permissions) is re-checked on the server
 * in every API route and in the admin layouts - never rely on this alone.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET ?? '';
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret);

  const needsStaff = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const needsUser = ['/account', '/checkout', '/orders'].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if ((needsStaff || needsUser) && !claims) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/super-admin') && claims?.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  if (pathname.startsWith('/admin') && claims && !STAFF_ROLE_KEYS.includes(claims.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const res = NextResponse.next();
  if (needsStaff) res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/account/:path*', '/checkout/:path*', '/orders/:path*'],
};
