import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { getCategories } from '@/modules/products/cached';

export const GET = route({ access: 'none' }, async () => {
  return NextResponse.json({ data: { items: await getCategories() } }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } });
});
