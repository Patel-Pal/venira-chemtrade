/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import type { Page, PageQuery } from '../interfaces';

/** Converts a lean Mongo document (ObjectIds, _id, __v) into a plain domain object (string ids). */
export function mapDoc<T>(doc: any): T {
  return convert(doc) as T;
}
function convert(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(convert);
  if (v instanceof Types.ObjectId || v?._bsontype === 'ObjectId') return String(v);
  if (typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === '__v') continue;
      out[k === '_id' ? 'id' : k] = convert(val);
    }
    return out;
  }
  return v;
}

export const isId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id);
export const oid = (id: string) => new Types.ObjectId(id);
export const oids = (ids: string[]) => ids.filter(isId).map(oid);

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
}

export function paged<T>(items: T[], total: number, q: PageQuery): Page<T> {
  return { items, total, page: q.page, limit: q.limit };
}
export const skip = (q: PageQuery) => (Math.max(1, q.page) - 1) * q.limit;

export function isDuplicateKey(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
}

/** Remove undefined keys so partial updates don't blank fields; converts *Id strings to ObjectIds. */
export function cleanPatch(patch: Record<string, any>, idKeys: string[] = []): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (idKeys.includes(k)) out[k] = v === null ? null : Array.isArray(v) ? oids(v) : oid(v);
    else out[k] = v;
  }
  return out;
}
