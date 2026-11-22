import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { getProduct } from '@/modules/products/cached';

export const GET = route<{ slug: string }>({ access: 'none' }, async ({ params }) => {
  const p = await getProduct(params.slug);
  if (!p) throw Errors.notFound('Product not found');
  return NextResponse.json({ data: p }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } });
});
