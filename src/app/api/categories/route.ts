import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { listPublicCategories } from '@/modules/products/catalog.service';

export const GET = route({ access: 'none' }, async () => {
  return NextResponse.json({ data: { items: await listPublicCategories() } }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } });
});
