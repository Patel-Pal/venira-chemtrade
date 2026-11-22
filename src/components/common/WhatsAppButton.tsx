'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { whatsappLink } from '@/utils/whatsapp';

/**
 * Floating "chat on WhatsApp" button. Opens a chat with the store number and a pre-filled message that
 * includes the page the visitor is looking at (so the team knows which product they are asking about).
 */
export default function WhatsAppButton({ phone, storeName }: { phone?: string; storeName: string }) {
  const pathname = usePathname();
  const [context, setContext] = useState('');

  // Read the page title/URL after navigation so the message always refers to the current page.
  useEffect(() => {
    const title = document.title.replace(/\s*[|\-–]\s*Venira Chemtrade.*$/i, '').trim();
    setContext(pathname === '/' ? '' : `${title ? `${title}\n` : ''}${window.location.href}`);
  }, [pathname]);

  const message = context ? `Hello ${storeName}, I would like to enquire about:\n${context}` : `Hello ${storeName}, I would like to know more about your products.`;
  const href = whatsappLink(phone, message);
  if (!href) return null;

  // Product pages show a sticky buy bar on mobile; lift the button above it so they never overlap.
  const onProduct = /^\/products\/[^/]+/.test(pathname);
  const bottomMobile = onProduct ? 'calc(64px + 76px + env(safe-area-inset-bottom))' : 'calc(64px + 16px + env(safe-area-inset-bottom))';

  return (
    <Tooltip title="Chat with us on WhatsApp" placement="left">
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        sx={{
          position: 'fixed', right: { xs: 14, md: 24 }, bottom: { xs: bottomMobile, md: 24 }, zIndex: 1080,
          width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', textDecoration: 'none',
          background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 8px 24px rgba(18,140,126,.45)',
          transition: 'transform .2s, box-shadow .2s',
          '&:hover': { transform: 'scale(1.08)', boxShadow: '0 12px 30px rgba(18,140,126,.55)' },
          '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #25D366', animation: 'waPulse 2.4s ease-out infinite' },
          '@keyframes waPulse': { '0%': { transform: 'scale(1)', opacity: 0.7 }, '100%': { transform: 'scale(1.6)', opacity: 0 } },
          '@media (prefers-reduced-motion: reduce)': { '&::before': { animation: 'none', display: 'none' } },
        }}
      >
        <WhatsAppIcon sx={{ fontSize: 32 }} />
      </Box>
    </Tooltip>
  );
}
