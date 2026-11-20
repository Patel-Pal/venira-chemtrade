'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Badge from '@mui/material/Badge';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import HomeIcon from '@mui/icons-material/Home';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonIcon from '@mui/icons-material/Person';
import { useCartCount, useWishCount } from './StoreHeader';
import { shadows } from '@/theme/tokens';

/** Native-app style bottom navigation: Home, Categories, Wishlist, Cart, Account. Mobile/tablet only. */
export default function BottomNav() {
  const pathname = usePathname();
  const cart = useCartCount();
  const wish = useWishCount();
  const value = pathname === '/' ? '/' : ['/categories', '/wishlist', '/cart', '/account'].find((p) => pathname.startsWith(p)) ?? (pathname.startsWith('/products') ? '/categories' : false);

  const items = [
    { href: '/', label: 'Home', icon: <HomeOutlinedIcon />, active: <HomeIcon /> },
    { href: '/categories', label: 'Categories', icon: <GridViewOutlinedIcon />, active: <GridViewIcon /> },
    { href: '/wishlist', label: 'Wishlist', icon: <Badge badgeContent={wish} color="secondary" max={99}><FavoriteBorderIcon /></Badge>, active: <Badge badgeContent={wish} color="secondary" max={99}><FavoriteIcon /></Badge> },
    { href: '/cart', label: 'Cart', icon: <Badge badgeContent={cart} color="primary" max={99}><ShoppingBagOutlinedIcon /></Badge>, active: <Badge badgeContent={cart} color="primary" max={99}><ShoppingBagIcon /></Badge> },
    { href: '/account', label: 'Account', icon: <PersonOutlineIcon />, active: <PersonIcon /> },
  ];

  return (
    <Paper component="nav" aria-label="Bottom navigation" elevation={0} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1100, display: { md: 'none' }, borderRadius: 0, borderTop: '1px solid', borderColor: 'divider', boxShadow: shadows.nav, pb: 'env(safe-area-inset-bottom)' }}>
      <BottomNavigation value={value} showLabels sx={{ height: 64, bgcolor: 'rgba(255,255,255,.96)', '& .MuiBottomNavigationAction-root': { minWidth: 0, paddingInline: 0.5, fontSize: '0.7rem' }, '& .Mui-selected': { color: 'primary.main', '& .MuiBottomNavigationAction-label': { fontWeight: 700 } } }}>
        {items.map((i) => (
          <BottomNavigationAction key={i.href} component={Link} href={i.href} value={i.href} label={i.label} icon={value === i.href ? i.active : i.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
