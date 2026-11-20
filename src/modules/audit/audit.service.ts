import { getRepos } from '@/database/repositories';
import { logger } from '@/lib/logger';

const SENSITIVE_KEY = /(password|hash|secret|token|signature|authorization|cookie)/i;

/** Deep copy that drops secrets and caps size so audit rows never contain credentials. */
export function scrub(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 5) return '[truncated]';
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[REDACTED]' : scrub(v, depth + 1)]),
    );
  }
  if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}...`;
  return value;
}

export interface AuditInput {
  userId?: string;
  ip?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}

/** Fire-and-forget safe: audit failures are logged but never break the business operation. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const repos = await getRepos();
    await repos.audit.append({
      ...input,
      before: scrub(input.before),
      after: scrub(input.after),
      meta: scrub(input.meta),
    });
  } catch (e) {
    logger.error('Failed to write audit log', { action: input.action, error: String(e) });
  }
}
