'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HistoryIcon from '@mui/icons-material/History';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '@/stores/auth.store';
import { post } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { brand, shadows } from '@/theme/tokens';

const LINKS = [
  { href: '/account', label: 'Profile', icon: <PersonOutlineIcon fontSize="small" /> },
  { href: '/account/orders', label: 'My orders', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  { href: '/account/addresses', label: 'Addresses', icon: <PlaceOutlinedIcon fontSize="small" /> },
  { href: '/wishlist', label: 'Wishlist', icon: <FavoriteBorderIcon fontSize="small" /> },
  { href: '/account/recently-viewed', label: 'Recently viewed', icon: <HistoryIcon fontSize="small" /> },
  { href: '/account/reviews', label: 'My reviews', icon: <StarBorderIcon fontSize="small" /> },
  { href: '/account/password', label: 'Change password', icon: <LockOutlinedIcon fontSize="small" /> },
];

export default function AccountShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setAnonymous = useAuthStore((s) => s.setAnonymous);
  const logout = async () => {
    await post('/api/auth/logout').catch(() => undefined);
    setAnonymous();
    qc.setQueryData(qk.me, { user: null });
    qc.clear();
    router.push('/');
    router.refresh();
  };
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, p: { xs: 2, md: 3 }, borderRadius: 5, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, background: `radial-gradient(500px 200px at 100% 0%, ${brand.skyLight}, transparent 70%), radial-gradient(400px 200px at 0% 100%, ${brand.greenLight}, transparent 70%), #fff` }}>
        <Avatar sx={{ width: { xs: 52, md: 64 }, height: { xs: 52, md: 64 }, fontSize: '1.5rem', fontWeight: 700, background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky})`, boxShadow: '0 6px 16px rgba(43,82,144,.3)' }}>{user?.name?.[0]?.toUpperCase() ?? <PersonOutlineIcon />}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="info.main">My account</Typography>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2.1rem' }, color: 'primary.dark' }}>{title}</Typography>
          {user && <Typography color="text.secondary" variant="body2" noWrap>{user.name} · {user.email}</Typography>}
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, alignItems: 'start' }}>
        <Box component="nav" aria-label="Account" sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 0.5, overflowX: 'auto', mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, pb: { xs: 0.5, md: 0 }, position: { md: 'sticky' }, top: { md: 100 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {LINKS.map((l) => {
            const active = l.href === '/account' ? pathname === '/account' : pathname.startsWith(l.href);
            return (
              <Button key={l.href} component={Link} href={l.href} startIcon={l.icon} color="inherit" aria-current={active ? 'page' : undefined}
                sx={{ justifyContent: 'flex-start', whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 99, bgcolor: active ? brand.skyLight : 'transparent', color: active ? 'primary.main' : 'text.primary', fontWeight: active ? 700 : 500, px: 2, boxShadow: active ? `inset 3px 0 0 ${brand.navy}` : 'none', '&:hover': { bgcolor: brand.skyLight } }}>
                {l.label}
              </Button>
            );
          })}
          <Button onClick={logout} startIcon={<LogoutIcon fontSize="small" />} color="inherit" sx={{ justifyContent: 'flex-start', whiteSpace: 'nowrap', flexShrink: 0, px: 2 }}>Logout</Button>
        </Box>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Box>
    </Container>
  );
}
