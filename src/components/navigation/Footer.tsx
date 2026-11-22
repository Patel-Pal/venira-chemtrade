import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { LogoFull } from '@/components/common/Logo';
import type { StoreSettings } from '@/modules/settings/settings.service';
import { brand } from '@/theme/tokens';
import { whatsappLink } from '@/utils/whatsapp';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NewsletterForm from './NewsletterForm';

const col = (title: string, links: { label: string; href: string }[]) => (
  <Box>
    <Typography variant="overline" sx={{ color: brand.sky, display: 'block', mb: 1.5 }}>{title}</Typography>
    <Stack spacing={1}>
      {links.map((l) => (
        <Typography key={l.href} component={Link} href={l.href} variant="body2" sx={{ color: 'rgba(255,255,255,.78)', textDecoration: 'none', display: 'inline-block', py: 0.25, transition: 'all .2s', '&:hover': { color: '#fff', transform: 'translateX(4px)' } }}>
          {l.label}
        </Typography>
      ))}
    </Stack>
  </Box>
);

export default function Footer({ settings }: { settings: StoreSettings }) {
  const socials = Object.entries(settings.social ?? {}).filter(([, v]) => v);
  return (
    <Box component="footer" sx={{ position: 'relative', overflow: 'hidden', background: `radial-gradient(700px 320px at 100% 0%, ${brand.navy}88, transparent 65%), ${brand.navyDeep}`, color: '#fff', mt: { xs: 8, md: 12 }, pt: { xs: 6, md: 9 }, pb: { xs: 12, md: 4 }, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` } }}>
      <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -60, bottom: -70, width: 380, height: 380, opacity: 0.06, pointerEvents: 'none' }}>
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'grid', gap: { xs: 5, md: 6 }, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.4fr 1fr 1fr 1.3fr' } }}>
          <Box>
            <Box sx={{ bgcolor: '#fff', borderRadius: 4, p: 1.5, display: 'inline-block' }}>
              <LogoFull height={132} />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mt: 2, maxWidth: 300 }}>
              {settings.tagline ?? 'Trusted Chemical Trading Partner'}
            </Typography>
            {settings.address && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mt: 1.5, maxWidth: 300 }}>{settings.address}</Typography>}
            {settings.contactPhone && <Typography variant="body2" component="a" href={`tel:${settings.contactPhone.replace(/\s/g, '')}`} sx={{ color: '#fff', display: 'block', mt: 1, textDecoration: 'none' }}>{settings.contactPhone}</Typography>}
            {whatsappLink(settings.whatsapp || settings.contactPhone, `Hello ${settings.storeName}, I would like to know more about your products.`) && (
              <Typography variant="body2" component="a" href={whatsappLink(settings.whatsapp || settings.contactPhone, `Hello ${settings.storeName}, I would like to know more about your products.`)!} target="_blank" rel="noopener noreferrer" sx={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.5, textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                <WhatsAppIcon fontSize="small" /> Chat on WhatsApp
              </Typography>
            )}
            {settings.contactEmail && <Typography variant="body2" component="a" href={`mailto:${settings.contactEmail}`} sx={{ color: '#fff', display: 'block', mt: 0.5, textDecoration: 'none' }}>{settings.contactEmail}</Typography>}
          </Box>
          {col('Shop', [{ label: 'All ingredients', href: '/products' }, { label: 'Categories', href: '/categories' }, { label: 'Wishlist', href: '/wishlist' }, { label: 'Cart', href: '/cart' }])}
          {col('Company', [{ label: 'About us', href: '/about' }, { label: 'Contact us', href: '/contact' }, { label: 'FAQ', href: '/faq' }, { label: 'My account', href: '/account' }])}
          <Box>
            {settings.featureFlags?.newsletter !== false && (
              <>
                <Typography variant="overline" sx={{ color: brand.sky, display: 'block', mb: 1.5 }}>Stay in the loop</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mb: 1.5 }}>Product updates and offers. No spam.</Typography>
                <NewsletterForm dark />
              </>
            )}
            {socials.length > 0 && (
              <Stack direction="row" spacing={2} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
                {socials.map(([k, v]) => (
                  <Typography key={k} component="a" href={v as string} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ color: '#fff', textTransform: 'capitalize', textDecoration: 'none', px: 1.5, py: 0.5, borderRadius: 99, border: '1px solid rgba(255,255,255,.28)', transition: 'all .2s', '&:hover': { bgcolor: 'rgba(255,255,255,.12)', borderColor: '#fff' } }}>
                    {k}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
        <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid rgba(255,255,255,.14)', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.6)' }}>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
            {[['Shipping', '/shipping-policy'], ['Returns & refunds', '/return-refund-policy'], ['Privacy', '/privacy-policy'], ['Terms', '/terms-and-conditions']].map(([l, h]) => (
              <Typography key={h} component={Link} href={h} variant="caption" sx={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', '&:hover': { color: '#fff' }, py: 0.5 }}>{l}</Typography>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
