import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { getEnv } from '@/config/env';
import { AppError, Errors } from './errors';
import { logger } from './logger';
import { assertSameOrigin, clientIp, rateLimit } from './security';
import { getAuth, requirePermission, type AuthContext } from './auth';
import type { Permission } from '@/constants/permissions';

const MAX_JSON_BYTES = 1_000_000;

export interface HandlerCtx<P = Record<string, string>> {
  req: NextRequest;
  params: P;
  ip: string;
  auth: AuthContext | null;
}
export type AuthedCtx<P = Record<string, string>> = Omit<HandlerCtx<P>, 'auth'> & { auth: AuthContext };

interface Options {
  /** 'none' public (no auth lookup), 'optional' resolves the user if signed in, 'user' any signed-in user, 'staff' admin-side user (permission check still required). */
  access?: 'none' | 'optional' | 'user' | 'staff';
  permission?: Permission | Permission[];
  anyPermission?: boolean;
  /** Per-IP limit: [maxRequests, windowMs] under a bucket name. */
  limit?: { bucket: string; max: number; windowMs: number };
  /** Skip same-origin check (server-to-server webhooks). */
  skipOriginCheck?: boolean;
}

type Fn<P> = (ctx: HandlerCtx<P>) => Promise<unknown>;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

function errorResponse(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields', details: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } },
      { status: 422 },
    );
  }
  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  }
  // Never leak internals (stack traces, driver errors) to clients.
  logger.error('Unhandled API error', { error: e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : String(e) });
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } }, { status: 500 });
}

/**
 * Wraps a route handler with: origin check, rate limiting, authentication, RBAC, safe JSON errors.
 * Authorization is ALWAYS evaluated here on the server.
 */
export function route<P = Record<string, string>>(opts: Options, fn: Fn<P>) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }): Promise<NextResponse | Response> => {
    try {
      const env = getEnv();
      const ip = clientIp(req);
      if (!opts.skipOriginCheck) assertSameOrigin(req, env.NEXT_PUBLIC_APP_URL);
      if (opts.limit) rateLimit(`${opts.limit.bucket}:${ip}`, opts.limit.max, opts.limit.windowMs);
      else if (req.method !== 'GET') rateLimit(`mut:${ip}`, 120, 60_000);

      const auth = opts.access && opts.access !== 'none' ? await getAuth() : null;
      if ((opts.access === 'user' || opts.access === 'staff') && !auth) throw Errors.unauthorized();
      if (opts.access === 'staff') {
        if (!auth!.isStaff) throw Errors.forbidden();
        if (opts.permission) requirePermission(auth!, opts.permission, opts.anyPermission);
      } else if (opts.permission && auth) {
        requirePermission(auth, opts.permission, opts.anyPermission);
      }

      const params = (await routeCtx?.params) ?? ({} as P);
      const result = await fn({ req, params, ip, auth });
      if (result instanceof Response) return result;
      return ok(result);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Parse + validate a JSON body. Only schema-declared keys survive (prevents mass assignment). */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_JSON_BYTES) throw new AppError('Request body too large', 413, 'PAYLOAD_TOO_LARGE');
  const text = await req.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError('Request body too large', 413, 'PAYLOAD_TOO_LARGE');
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw Errors.badRequest('Invalid JSON body');
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

/** multipart parsing that turns malformed bodies into a clean 400 instead of a 500. */
export async function readForm(req: Request): Promise<FormData> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) {
    throw Errors.badRequest('Expected a multipart/form-data upload');
  }
  try {
    return await req.formData();
  } catch {
    throw Errors.badRequest('Could not read the uploaded form');
  }
}
