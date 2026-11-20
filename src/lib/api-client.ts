/** Centralised typed fetch client for the browser. All server responses use { data } or { error }. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: { path: string; message: string }[] | unknown,
  ) {
    super(message);
  }
}

interface Options extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { body, query, headers, ...rest } = opts;
  let url = path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...rest,
    headers: { ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  let json: { data?: T; error?: { code: string; message: string; details?: unknown } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || json?.error) {
    const e = json?.error;
    throw new ApiError(e?.message ?? 'Something went wrong. Please try again.', res.status, e?.code ?? 'ERROR', e?.details);
  }
  return json?.data as T;
}

export const get = <T,>(path: string, query?: Options['query']) => api<T>(path, { query });
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body ?? {} });
export const put = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body: body ?? {} });
export const patch = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body: body ?? {} });
export const del = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'DELETE', body });

/** Maps server validation details to react-hook-form field errors. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (e instanceof ApiError && Array.isArray(e.details)) {
    return Object.fromEntries((e.details as { path: string; message: string }[]).map((d) => [d.path, d.message]));
  }
  return {};
}
