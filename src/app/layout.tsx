import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import AppProviders from '@/components/providers/AppProviders';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'Venira Chemtrade | Cosmetic ingredients & raw materials', template: '%s | Venira Chemtrade' },
  description: 'Venira Chemtrade - Trusted Chemical Trading Partner. The power behind the beauty products.',
  applicationName: 'Venira Chemtrade',
  openGraph: { type: 'website', siteName: 'Venira Chemtrade', images: [{ url: '/images/logo-full.png', width: 440, height: 568, alt: 'Venira Chemtrade' }] },
  icons: { icon: '/images/logo-mark.png', apple: '/images/logo-mark.png' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2B5290',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
