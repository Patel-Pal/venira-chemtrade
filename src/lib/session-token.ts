/** Edge-safe (jose only, no Node APIs, no DB). Used by middleware and the Node auth layer. */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'vc_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

export interface SessionClaims {
  jti: string; // opaque id whose sha256 is stored in the sessions collection
  uid: string;
  role: string;
}

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(claims: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({ uid: claims.uid, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<SessionClaims | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    if (!payload.jti || typeof payload.uid !== 'string' || typeof payload.role !== 'string') return null;
    return { jti: payload.jti, uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_S,
});
