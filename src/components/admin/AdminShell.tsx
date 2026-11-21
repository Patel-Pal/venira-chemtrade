'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import InputBase from '@mui/material/InputBase';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ViewCarouselOutlinedIcon from '@mui/icons-material/ViewCarouselOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { LogoLink } from '@/components/common/Logo';
import { get, patch, post } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { brand } from '@/theme/tokens';
import { ADMIN_LINKS, SUPER_LINKS, type NavLink } from '@/constants/admin-nav';

const W = 264;
const ICONS: Record<string, React.ReactNode> = {
  '/admin': <DashboardOutlinedIcon />, '/admin/products': <Inventory2OutlinedIcon />, '/admin/categories': <CategoryOutlinedIcon />,
  '/admin/inventory': <WarehouseOutlinedIcon />, '/admin/orders': <ReceiptLongOutlinedIcon />, '/admin/customers': <PeopleOutlineIcon />,
  '/admin/coupons': <LocalOfferOutlinedIcon />, '/admin/reviews': <StarBorderIcon />, '/admin/banners': <ViewCarouselOutlinedIcon />,
  '/admin/payments': <PaymentsOutlinedIcon />, '/admin/reports': <BarChartIcon />, '/admin/settings': <SettingsOutlinedIcon />,
  '/super-admin': <DashboardOutlinedIcon />, '/super-admin/admins': <ManageAccountsOutlinedIcon />, '/super-admin/roles': <AdminPanelSettingsOutlinedIcon />,
  '/super-admin/permissions': <VpnKeyOutlinedIcon />, '/super-admin/analytics': <BarChartIcon />, '/super-admin/audit-logs': <HistoryIcon />, '/super-admin/settings': <TuneIcon />,
};
const withIcons = (links: NavLink[]) => links.map((l) => ({ ...l, icon: ICONS[l.href] }));
const ADMIN_NAV = withIcons(ADMIN_LINKS);
const SUPER_NAV = withIcons(SUPER_LINKS);
interface Notif { id: string; type: string; title?: string; body?: string; readAt?: string | null; createdAt?: string }

function Bell() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { data } = useQuery({ queryKey: ['admin', 'notifications'], queryFn: () => get<{ items: Notif[] }>('/api/admin/notifications'), refetchInterval: 60_000 });
  const unread = data?.items.filter((n) => !n.readAt).length ?? 0;
  const read = async (id: string) => { await patch('/api/admin/notifications', { id }); qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }); };
  return (
    <>
      <IconButton aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={(e) => setAnchor(e.currentTarget)}><Badge badgeContent={unread} color="error"><NotificationsNoneIcon /></Badge></IconButton>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 340, maxWidth: '92vw', borderRadius: 3, mt: 1 } } }}>
        <Typography sx={{ p: 2, fontWeight: 800 }}>Notifications</Typography>
        <Divider />
        {data?.items.length ? data.items.map((n) => (
          <Box key={n.id} onClick={() => !n.readAt && read(n.id)} sx={{ p: 1.75, borderBottom: `1px solid ${brand.line}`, bgcolor: n.readAt ? 'transparent' : brand.skyLight, cursor: n.readAt ? 'default' : 'pointer' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{n.title}</Typography>
            {n.body && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line' }}>{n.body.slice(0, 160)}</Typography>}
          </Box>
        )) : <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">You&apos;re all caught up.</Typography>}
      </Popover>
    </>
  );
}

export default function AdminShell({ variant, children, permissions, isSuperAdmin }: { variant: 'admin' | 'super'; children: React.ReactNode; permissions: string[]; isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [q, setQ] = useState('');
  const nav = (variant === 'admin' ? ADMIN_NAV : SUPER_NAV).filter((n) => isSuperAdmin || !n.perm || permissions.includes(n.perm));
  const home = variant === 'admin' ? '/admin' : '/super-admin';

  const crumbs = pathname.split('/').filter(Boolean);
  const logout = async () => { await post('/api/auth/logout').catch(() => undefined); useAuthStore.getState().setAnonymous(); qc.clear(); router.push('/login'); router.refresh(); };
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(/^VC-/i.test(v) ? `/admin/orders?search=${encodeURIComponent(v)}` : `/admin/products?search=${encodeURIComponent(v)}`);
    setQ('');
  };

  const sidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', color: brand.ink, borderRight: `1px solid ${brand.line}` }}>
      <Box sx={{ px: 2.5, py: 2, m: 1.5, mb: 0.5 }}><LogoLink /></Box>
      <Chip size="small" label={variant === 'admin' ? 'Admin panel' : 'Super Admin'} sx={{ alignSelf: 'flex-start', ml: 2.5, mb: 1, bgcolor: variant === 'admin' ? brand.skyLight : brand.greenLight, color: variant === 'admin' ? brand.navy : brand.greenDark, fontWeight: 800 }} />
      <List component="nav" aria-label="Admin navigation" sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
        {nav.map((n) => {
          const active = n.href === home ? pathname === home : pathname.startsWith(n.href);
          return (
            <ListItemButton key={n.href} component={Link} href={n.href} onClick={() => setOpen(false)} selected={active} aria-current={active ? 'page' : undefined}
              sx={{ borderRadius: 2.5, mb: 0.5, minHeight: 46, color: brand.muted, '&.Mui-selected': { bgcolor: brand.skyLight, color: brand.navy, '&:hover': { bgcolor: brand.skyLight } }, '&:hover': { bgcolor: brand.canvas } }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} slotProps={{ primary: { fontWeight: active ? 700 : 500, fontSize: '0.92rem' } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5 }}>
        {(variant === 'super' || isSuperAdmin) && (
          <ListItemButton component={Link} href={variant === 'super' ? '/admin' : '/super-admin'} sx={{ borderRadius: 2.5, color: brand.muted }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AdminPanelSettingsOutlinedIcon /></ListItemIcon>
            <ListItemText primary={variant === 'super' ? 'Admin panel' : 'Super Admin'} />
          </ListItemButton>
        )}
        <ListItemButton component={Link} href="/" target="_blank" sx={{ borderRadius: 2.5, color: brand.muted }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><StorefrontOutlinedIcon /></ListItemIcon>
          <ListItemText primary="Open storefront" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: brand.canvas }}>
      <Box component="aside" sx={{ display: { xs: 'none', lg: 'block' }, width: W, flexShrink: 0, position: 'fixed', inset: '0 auto 0 0' }}>{sidebar}</Box>
      <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { lg: 'none' } }} slotProps={{ paper: { sx: { width: W, maxWidth: '86vw' } } }}>{sidebar}</Drawer>

      <Box sx={{ flex: 1, minWidth: 0, ml: { lg: `${W}px` } }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${brand.line}` }}>
          <Toolbar sx={{ gap: 1, minHeight: 64 }}>
            <IconButton aria-label="Open navigation" onClick={() => setOpen(true)} sx={{ display: { lg: 'none' } }}><MenuIcon /></IconButton>
            <Breadcrumbs aria-label="Breadcrumb" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.85rem', textTransform: 'capitalize', minWidth: 0 }}>
              {crumbs.map((c, i) => {
                const href = '/' + crumbs.slice(0, i + 1).join('/');
                return i === crumbs.length - 1 ? <Typography key={href} color="text.primary" sx={{ fontSize: 'inherit', fontWeight: 700 }}>{/^[a-f0-9]{24}$/.test(c) ? 'Details' : c.replace(/-/g, ' ')}</Typography> : <Link key={href} href={href}>{c.replace(/-/g, ' ')}</Link>;
              })}
            </Breadcrumbs>
            <Box sx={{ flex: 1 }} />
            {variant === 'admin' && (
              <Box component="form" onSubmit={search} role="search" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', bgcolor: '#F1F5FA', borderRadius: 99, px: 2, width: 280 }}>
                <SearchIcon fontSize="small" color="action" />
                <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or order no." inputProps={{ 'aria-label': 'Admin search' }} sx={{ ml: 1, flex: 1, py: 0.5 }} />
              </Box>
            )}
            <Bell />
            <IconButton aria-label="Profile menu" onClick={(e) => setMenu(e.currentTarget)}><Avatar sx={{ width: 34, height: 34, bgcolor: brand.navy, fontSize: '0.9rem' }}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Avatar></IconButton>
            <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 220, mt: 1 } } }}>
              <Box sx={{ px: 2, py: 1 }}><Typography sx={{ fontWeight: 700 }} noWrap>{user?.name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography><br /><Chip size="small" label={user?.roleKey?.replace(/_/g, ' ')} sx={{ mt: 0.5, textTransform: 'capitalize' }} /></Box>
              <Divider />
              <MenuItem component={Link} href="/account" onClick={() => setMenu(null)}>My account</MenuItem>
              <MenuItem onClick={logout}>Sign out</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1500 }}>{children}</Box>
      </Box>
    </Box>
  );
}
