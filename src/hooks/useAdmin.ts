'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post, put } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useUiStore } from '@/stores/ui.store';
import type { Paged } from './useCatalog';

type Params = Record<string, string | number | boolean | undefined>;

/** Generic list query against /api/admin/<resource> (or any admin endpoint path). */
export function useAdminList<T>(resource: string, params: Params = {}, path = `/api/admin/${resource}`) {
  return useQuery({
    queryKey: qk.admin.list(resource, params),
    queryFn: () => get<Paged<T>>(path, params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useAdminItem<T>(resource: string, id: string | null, path = `/api/admin/${resource}/${id}`) {
  return useQuery({ queryKey: qk.admin.item(resource, id ?? ''), queryFn: () => get<T>(path), enabled: Boolean(id) });
}

/** Mutation helper: toasts the outcome and invalidates every cached query for the resource. */
export function useAdminMutation<TIn, TOut = unknown>(resource: string, fn: (input: TIn) => Promise<TOut>, success = 'Saved') {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { notify(success); qc.invalidateQueries({ queryKey: qk.admin.all(resource) }); },
    onError: (e: Error) => notify(e.message, 'error'),
  });
}

export const adminApi = {
  create: <T,>(resource: string, body: unknown) => post<T>(`/api/admin/${resource}`, body),
  update: <T,>(resource: string, id: string, body: unknown) => put<T>(`/api/admin/${resource}/${id}`, body),
  remove: (resource: string, id: string) => del(`/api/admin/${resource}/${id}`),
};
