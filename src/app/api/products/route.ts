import { NextResponse } from 'next/server';
import { route, parseQuery } from '@/lib/api';
import { productQuerySchema } from '@/schemas';
import { getProductList } from '@/modules/products/cached';

export const GET = route({ access: 'none' }, async ({ req }) => {
  const q = parseQuery(req, productQuerySchema);
  const page = await getProductList(q);
  return NextResponse.json({ data: page }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } });
});
