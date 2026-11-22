'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { LogoFull, LogoLink } from '@/components/common/Logo';
import SearchBox from './SearchBox';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { post } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { brand } from '@/theme/tokens';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/products' },
  { label: 'Categories', href: '/categories' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function AnnouncementBar({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Box role="note" sx={{ background: `linear-gradient(90deg, ${brand.navyDeep}, ${brand.navy} 50%, ${brand.navyDeep})`, color: '#fff', textAlign: 'center', py: 0.9, px: 2, fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.03em' }}>
      {text}
    </Box>
  );
}

export function useCartCount() {
  const hydrated = useCartStore((s) => s.hydrated);
  const n = useCartStore((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  return hydrated ? n : 0;
}
export function useWishCount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const n = useWishlistStore((s) => s.productIds.length);
  return mounted ? n : 0;
}

export default function StoreHeader({ announcement }: { announcement?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const menuOpen = useUiStore((s) => s.menuOpen);
  const setMenuOpen = useUiStore((s) => s.setMenuOpen);
  const cartCount = useCartCount();
  const wishCount = useWishCount();
  const { user, status, isStaff, setAnonymous } = useAuthStore();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, setMenuOpen]);

  const logout = async () => {
    setAnchor(null);
    try {
      await post('/api/auth/logout');
    } finally {
      setAnonymous();
      qc.setQueryData(qk.me, { user: null });
      qc.removeQueries({ queryKey: qk.orders.all });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <>
      <AnnouncementBar text={announcement} />
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.86)', backdropFilter: 'saturate(180%) blur(16px)', borderBottom: `1px solid ${brand.line}`, boxShadow: '0 6px 24px rgba(16,36,63,0.05)', '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green} 60%, transparent)`, opacity: 0.7 } }}>
        <Toolbar sx={{ gap: { xs: 0.5, md: 3 }, minHeight: { xs: 56, md: 76 }, maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 1, md: 3 } }}>
          <IconButton aria-label="Open menu" onClick={() => setMenuOpen(true)} sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <LogoLink />
          <Box component="nav" aria-label="Main" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 1 }}>
            {NAV.map((n) => {
              const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
              return (
                <Button key={n.href} component={Link} href={n.href} color="inherit" aria-current={active ? 'page' : undefined} sx={{ color: active ? 'primary.main' : 'text.primary', fontWeight: active ? 700 : 500, position: 'relative', borderRadius: 99, bgcolor: active ? brand.skyLight : 'transparent', '&:hover': { bgcolor: brand.skyLight }, '&::after': { content: '""', position: 'absolute', left: 18, right: 18, bottom: 6, height: 2, borderRadius: 2, bgcolor: 'info.main', transform: active ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .25s' }, '&:hover::after': { transform: 'scaleX(1)' } }}>
                  {n.label}
                </Button>
              );
            })}
          </Box>
          <Box sx={{ flex: 1, maxWidth: 440, ml: 'auto', display: { xs: 'none', md: 'block' } }}>
            <SearchBox />
          </Box>
          <Box sx={{ ml: { xs: 'auto', md: 0 }, display: 'flex', alignItems: 'center' }}>
            <IconButton aria-label={searchOpen ? 'Close search' : 'Search'} aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </IconButton>
            <IconButton component={Link} href="/wishlist" aria-label={`Wishlist${wishCount ? `, ${wishCount} items` : ''}`} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Badge badgeContent={wishCount} color="secondary" max={99}><FavoriteBorderIcon /></Badge>
            </IconButton>
            <IconButton component={Link} href="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}>
              <Badge badgeContent={cartCount} color="primary" max={99}><ShoppingBagOutlinedIcon /></Badge>
            </IconButton>
            {status === 'authenticated' ? (
              <>
                <IconButton aria-label="Account menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                  <PersonOutlineIcon />
                </IconButton>
                <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 200, mt: 1 } } }}>
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" noWrap>{user?.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
                  </Box>
                  <Divider />
                  <MenuItem component={Link} href="/account" onClick={() => setAnchor(null)}>My account</MenuItem>
                  <MenuItem component={Link} href="/account/orders" onClick={() => setAnchor(null)}>My orders</MenuItem>
                  {isStaff && <MenuItem component={Link} href="/admin" onClick={() => setAnchor(null)}>Admin panel</MenuItem>}
                  <MenuItem onClick={logout}>Sign out</MenuItem>
                </Menu>
              </>
            ) : (
              status !== 'loading' && (
                <Button component={Link} href="/login" variant="contained" size="small" sx={{ ml: 1, display: { xs: 'none', md: 'inline-flex' }, borderRadius: 99, px: 3 }}>
                  Sign in
                </Button>
              )
            )}
          </Box>
        </Toolbar>
        {/* Mobile: search icon next to the cart; tapping it slides the search field open. Desktop keeps it inside the toolbar. */}
        <Collapse in={searchOpen} timeout={250} unmountOnExit sx={{ display: { md: 'none' } }}>
          <Box role="search" sx={{ px: 1.5, pb: 1.25, pt: 0.25 }}>
            <SearchBox autoFocus placeholder="Search ingredients, SKU or category" onDone={() => setSearchOpen(false)} />
          </Box>
        </Collapse>
      </AppBar>

      <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { width: 300, maxWidth: '86vw' } } }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <LogoFull height={120} />
          <IconButton aria-label="Close menu" onClick={() => setMenuOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <List component="nav" aria-label="Mobile">
          {NAV.map((n) => (
            <ListItemButton key={n.href} component={Link} href={n.href} selected={n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)} sx={{ minHeight: 52 }}>
              <ListItemText primary={n.label} slotProps={{ primary: { fontWeight: 600 } }} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1 }} />
          {status === 'authenticated' ? (
            <>
              <ListItemButton component={Link} href="/account" sx={{ minHeight: 52 }}><ListItemText primary="My account" /></ListItemButton>
              {isStaff && <ListItemButton component={Link} href="/admin" sx={{ minHeight: 52 }}><ListItemText primary="Admin panel" /></ListItemButton>}
              <ListItemButton onClick={logout} sx={{ minHeight: 52 }}><ListItemText primary="Sign out" /></ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton component={Link} href="/login" sx={{ minHeight: 52 }}><ListItemText primary="Sign in" /></ListItemButton>
              <ListItemButton component={Link} href="/register" sx={{ minHeight: 52 }}><ListItemText primary="Create account" /></ListItemButton>
            </>
          )}
        </List>
      </Drawer>
    </>
  );
}
