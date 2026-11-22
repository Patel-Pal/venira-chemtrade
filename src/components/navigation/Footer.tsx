import Link from 'next/link';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { LogoFull } from '@/components/common/Logo';
import type { StoreSettings } from '@/modules/settings/settings.service';
import { brand } from '@/theme/tokens';
import { whatsappLink } from '@/utils/whatsapp';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NewsletterForm from './NewsletterForm';

type FooterLink = { label: string; href: string };

const SHOP_LINKS: FooterLink[] = [{ label: 'All ingredients', href: '/products' }, { label: 'Categories', href: '/categories' }, { label: 'Wishlist', href: '/wishlist' }, { label: 'Cart', href: '/cart' }];
const COMPANY_LINKS: FooterLink[] = [{ label: 'About us', href: '/about' }, { label: 'Contact us', href: '/contact' }, { label: 'FAQ', href: '/faq' }, { label: 'My account', href: '/account' }];

const col = (title: string, links: FooterLink[]) => (
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

// Mobile-only collapsible section (native <details>: no client JS, works in a server component).
const accordion = (title: string, body: ReactNode) => (
  <Box
    component="details"
    sx={{
      borderBottom: '1px solid rgba(255,255,255,.14)',
      '& > summary': { listStyle: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, py: 1, '&::-webkit-details-marker': { display: 'none' } },
      '& .chev': { transition: 'transform .2s', color: 'rgba(255,255,255,.7)' },
      '&[open] .chev': { transform: 'rotate(180deg)' },
    }}
  >
    <summary>
      <Typography variant="subtitle2" component="span" sx={{ color: '#fff', fontWeight: 600 }}>{title}</Typography>
      <ExpandMoreIcon className="chev" />
    </summary>
    <Box sx={{ pb: 2 }}>{body}</Box>
  </Box>
);

const linkList = (links: FooterLink[]) => (
  <Stack spacing={0.25}>
    {links.map((l) => (
      <Typography key={l.href} component={Link} href={l.href} variant="body2" sx={{ color: 'rgba(255,255,255,.8)', textDecoration: 'none', py: 0.75 }}>{l.label}</Typography>
    ))}
  </Stack>
);

export default function Footer({ settings }: { settings: StoreSettings }) {
  const socials = Object.entries(settings.social ?? {}).filter(([, v]) => v);
  const waHref = whatsappLink(settings.whatsapp || settings.contactPhone, `Hello ${settings.storeName}, I would like to know more about your products.`);
  const showNewsletter = settings.featureFlags?.newsletter !== false;
  const tagline = settings.tagline ?? 'Trusted Chemical Trading Partner';
  return (
    <Box component="footer" sx={{ position: 'relative', overflow: 'hidden', background: `radial-gradient(700px 320px at 100% 0%, ${brand.navy}88, transparent 65%), ${brand.navyDeep}`, color: '#fff', mt: { xs: 5, md: 12 }, pt: { xs: 3.5, md: 9 }, pb: { xs: 11, md: 4 }, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` } }}>
      <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -60, bottom: -70, width: 380, height: 380, opacity: 0.06, pointerEvents: 'none' }}>
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        {/* Mobile: compact, FAQ-style collapsible footer */}
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, p: 0.75, display: 'inline-flex', flexShrink: 0 }}>
              <LogoFull height={44} />
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.75)' }}>{tagline}</Typography>
          </Box>
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,.14)' }}>
            {accordion('Shop', linkList(SHOP_LINKS))}
            {accordion('Company', linkList(COMPANY_LINKS))}
            {accordion('Contact', (
              <Stack spacing={0.75}>
                {settings.address && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.75)' }}>{settings.address}</Typography>}
                {settings.contactPhone && <Typography variant="body2" component="a" href={`tel:${settings.contactPhone.replace(/\s/g, '')}`} sx={{ color: '#fff', textDecoration: 'none', py: 0.5 }}>{settings.contactPhone}</Typography>}
                {waHref && (
                  <Typography variant="body2" component="a" href={waHref} target="_blank" rel="noopener noreferrer" sx={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 0.75, textDecoration: 'none', py: 0.5 }}>
                    <WhatsAppIcon fontSize="small" /> Chat on WhatsApp
                  </Typography>
                )}
                {settings.contactEmail && <Typography variant="body2" component="a" href={`mailto:${settings.contactEmail}`} sx={{ color: '#fff', textDecoration: 'none', py: 0.5 }}>{settings.contactEmail}</Typography>}
              </Stack>
            ))}
            {(showNewsletter || socials.length > 0) && accordion('Stay in the loop', (
              <>
                {showNewsletter && <NewsletterForm dark />}
                {socials.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                    {socials.map(([k, v]) => (
                      <Typography key={k} component="a" href={v as string} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ color: '#fff', textTransform: 'capitalize', textDecoration: 'none', px: 1.5, py: 0.5, borderRadius: 99, border: '1px solid rgba(255,255,255,.28)' }}>{k}</Typography>
                    ))}
                  </Stack>
                )}
              </>
            ))}
          </Box>
        </Box>

        {/* Tablet / desktop */}
        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gap: 6, gridTemplateColumns: { sm: '1fr 1fr', md: '1.4fr 1fr 1fr 1.3fr' } }}>
          <Box>
            <Box sx={{ bgcolor: '#fff', borderRadius: 4, p: 1.5, display: 'inline-block' }}>
              <LogoFull height={132} />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mt: 2, maxWidth: 300 }}>{tagline}</Typography>
            {settings.address && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mt: 1.5, maxWidth: 300 }}>{settings.address}</Typography>}
            {settings.contactPhone && <Typography variant="body2" component="a" href={`tel:${settings.contactPhone.replace(/\s/g, '')}`} sx={{ color: '#fff', display: 'block', mt: 1, textDecoration: 'none' }}>{settings.contactPhone}</Typography>}
            {waHref && (
              <Typography variant="body2" component="a" href={waHref} target="_blank" rel="noopener noreferrer" sx={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.5, textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                <WhatsAppIcon fontSize="small" /> Chat on WhatsApp
              </Typography>
            )}
            {settings.contactEmail && <Typography variant="body2" component="a" href={`mailto:${settings.contactEmail}`} sx={{ color: '#fff', display: 'block', mt: 0.5, textDecoration: 'none' }}>{settings.contactEmail}</Typography>}
          </Box>
          {col('Shop', SHOP_LINKS)}
          {col('Company', COMPANY_LINKS)}
          <Box>
            {showNewsletter && (
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

        <Box sx={{ mt: { xs: 2, sm: 6 }, pt: { xs: 0, sm: 3 }, borderTop: { xs: 'none', sm: '1px solid rgba(255,255,255,.14)' }, display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 }, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.6)' }}>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={{ xs: 1.75, sm: 2.5 }} flexWrap="wrap" useFlexGap>
            {[['Shipping', '/shipping-policy'], ['Returns & refunds', '/return-refund-policy'], ['Privacy', '/privacy-policy'], ['Terms', '/terms-and-conditions']].map(([l, h]) => (
              <Typography key={h} component={Link} href={h} variant="caption" sx={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none', '&:hover': { color: '#fff' }, py: 0.5 }}>{l}</Typography>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
