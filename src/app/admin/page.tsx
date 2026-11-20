import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DashboardView from '@/components/admin/DashboardView';
import { ADMIN_LINKS } from '@/constants/admin-nav';
import { guard } from '@/lib/page-guard';
import { getAuth, hasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';

export default async function AdminHome() {
  const ok = await guard('reports.read');
  if (ok) return <DashboardView />;
  // Staff without reporting access get a landing page with the sections they can use.
  const auth = await getAuth();
  const allowed = ADMIN_LINKS.filter((n) => n.href !== '/admin' && auth && (!n.perm || hasPermission(auth, n.perm)));
  return (
    <Box>
      <PageHeader title={`Welcome, ${auth?.user.name.split(' ')[0] ?? ''}`} subtitle="Choose a section to get started." />
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {allowed.map((n) => <Button key={n.href} component={Link} href={n.href} variant="outlined">{n.label}</Button>)}
        {allowed.length === 0 && <Typography color="text.secondary">No modules are assigned to your role yet.</Typography>}
      </Box>
    </Box>
  );
}
