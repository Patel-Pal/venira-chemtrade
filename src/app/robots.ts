import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/super-admin', '/api/', '/account', '/checkout', '/cart', '/orders', '/login', '/register'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
