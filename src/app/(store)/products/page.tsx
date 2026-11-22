import { Suspense } from 'react';
import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import ProductListing from '@/components/products/ProductListing';
import { ProductGridSkeleton } from '@/components/common/ui';
import { getCategories, getProductList } from '@/modules/products/cached';
import { filtersFromSearch, toListParams } from '@/lib/list-params';
import { productQuerySchema } from '@/schemas';

export const metadata: Metadata = {
  title: 'Shop ingredients',
  description: 'Browse cosmetic ingredients: emulsifiers, actives, surfactants, silicones, UV filters, oils, butters and extracts.',
  alternates: { canonical: '/products' },
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The first page of products (and the categories) are loaded here on the server and handed to the client list,
 * so visitors see products in the very first HTML instead of waiting for JavaScript to load and then call the API.
 */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, page } = filtersFromSearch(await searchParams);
  const initialParams = toListParams(filters, page);
  // Validate with the same schema the API uses; bad input simply skips pre-rendering (the client then reports the error).
  const parsed = productQuerySchema.safeParse({ ...initialParams, inStock: initialParams.inStock ? 'true' : undefined });
  const [initialData, initialCategories] = await Promise.all([
    parsed.success ? getProductList(parsed.data).catch(() => undefined) : undefined,
    getCategories().catch(() => undefined),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductListing initialParams={initialParams} initialFilters={filters} initialPage={page} initialData={initialData} initialCategories={initialCategories} />
      </Suspense>
    </Container>
  );
}
