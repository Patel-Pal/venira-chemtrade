import Box from '@mui/material/Box';
import StoreHeader from '@/components/navigation/StoreHeader';
import BottomNav from '@/components/navigation/BottomNav';
import Footer from '@/components/navigation/Footer';
import QuickView from '@/components/products/QuickView';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import MaintenanceView from '@/components/common/MaintenanceView';
import { getPublicSettings } from '@/modules/settings/public-settings';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  if (settings.maintenanceMode) {
    const auth = await getAuth().catch(() => null);
    if (!auth?.isStaff) return <MaintenanceView phone={settings.contactPhone} />;
  }
  return (
    <>
      <Box component="a" href="#main" sx={{ position: 'absolute', left: -9999, '&:focus': { left: 8, top: 8, zIndex: 3000, bgcolor: '#fff', p: 1.5, borderRadius: 2 } }}>
        Skip to content
      </Box>
      <StoreHeader announcement={settings.announcement} />
      <Box component="main" id="main" sx={{ minHeight: '60vh', pb: { xs: '72px', md: 0 } }}>
        {children}
      </Box>
      <Footer settings={settings} />
      <BottomNav />
      <WhatsAppButton phone={settings.whatsapp || settings.contactPhone} storeName={settings.storeName} />
      <QuickView />
    </>
  );
}
