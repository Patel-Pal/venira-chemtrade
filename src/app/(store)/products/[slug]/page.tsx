import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Container from '@mui/material/Container';
import ProductDetailView from '@/components/products/ProductDetailView';
import { getProduct, getRelated } from '@/modules/products/cached';
import { getPublicSettings } from '@/modules/settings/public-settings';

export const dynamic = 'force-dynamic';

// Shared with /api/products/[slug]: one cache entry serves both the page and the API.
const loadProduct = getProduct;
const loadRelated = getRelated;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug).catch(() => null);
  if (!p) return { title: 'Product not found' };
  const description = p.seo?.description ?? p.shortDescription ?? p.description?.slice(0, 160) ?? `${p.name} - available from Venira Chemtrade. Contact us for pricing and specifications.`;
  const title = p.seo?.title ?? p.name;
  return {
    title, description, alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title, description, type: 'website', url: `/products/${p.slug}`, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([loadProduct(slug).catch(() => null), getPublicSettings()]);
  if (!product) notFound();
  const related = await loadRelated(product.id).catch(() => []);

  const priced = product.variants.filter((v) => v.pricePaise !== null);
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description ?? product.shortDescription,
      sku: product.variants[0]?.sku, image: product.images.map((i) => i.url), brand: { '@type': 'Brand', name: settings.storeName }, category: product.category?.name,
      ...(priced.length ? {
        offers: {
          '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...priced.map((v) => v.pricePaise!)) / 100, highPrice: Math.max(...priced.map((v) => v.pricePaise!)) / 100, offerCount: priced.length,
          availability: priced.some((v) => v.inStock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${appUrl}/products/${product.slug}`,
        },
      } : {}),
      ...(product.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAverage, reviewCount: product.ratingCount } } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${appUrl}/products` },
        ...(product.category ? [{ '@type': 'ListItem', position: 3, name: product.category.name, item: `${appUrl}/products?category=${product.category.slug}` }] : []),
        { '@type': 'ListItem', position: product.category ? 4 : 3, name: product.name, item: `${appUrl}/products/${product.slug}` },
      ],
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j).replace(/</g, '\\u003c') }} />
      ))}
      <ProductDetailView product={product} related={related} reviewsEnabled={settings.featureFlags.reviews !== false} />
    </Container>
  );
}
