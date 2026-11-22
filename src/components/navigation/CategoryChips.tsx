'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { useCategories } from '@/hooks/useCatalog';
import { brand } from '@/theme/tokens';

export interface ChipItem {
  name: string;
  slug: string;
}

/**
 * Swipeable row of category chips ("All" + top-level categories) for one-tap browsing on mobile.
 * - Pass `onSelect` to filter in place (product list); omit it to render links to /products?category=...
 * - Pass `items` when the server already has the categories (home page) to avoid a client fetch and layout shift.
 */
export default function CategoryChips({ items, activeSlug = '', onSelect, label = 'Browse by category' }: {
  items?: ChipItem[];
  activeSlug?: string;
  onSelect?: (slug: string) => void;
  label?: string;
}) {
  const { data, isLoading } = useCategories(!items);
  const list: ChipItem[] | undefined = items ?? data?.filter((c) => !c.parentId).map((c) => ({ name: c.name, slug: c.slug }));
  const activeRef = useRef<HTMLElement | null>(null);

  // Keep the selected chip in view (horizontal only - never scrolls the page).
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [activeSlug, list?.length]);

  const chip = (key: string, text: string, slug: string) => {
    const active = slug === activeSlug;
    const common = {
      key,
      label: text,
      clickable: true,
      color: active ? ('primary' as const) : ('default' as const),
      variant: active ? ('filled' as const) : ('outlined' as const),
      'aria-pressed': onSelect ? active : undefined,
      'aria-current': !onSelect && active ? ('page' as const) : undefined,
      ref: (el: HTMLElement | null) => { if (active) activeRef.current = el; },
      sx: { height: 40, px: 0.75, flexShrink: 0, fontSize: '0.9rem', bgcolor: active ? undefined : '#fff', borderColor: active ? undefined : brand.line },
    };
    return onSelect
      ? <Chip {...common} onClick={() => onSelect(slug)} />
      : <Chip {...common} component={Link} href={slug ? `/products?category=${slug}` : '/products'} />;
  };

  return (
    <Box
      component="nav"
      aria-label={label}
      sx={{
        display: 'flex', gap: 1, overflowX: 'auto', mx: -2, px: 2, py: 0.5,
        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        // fade hints that the row scrolls
        WebkitMaskImage: 'linear-gradient(90deg, #000 90%, transparent)', maskImage: 'linear-gradient(90deg, #000 90%, transparent)',
      }}
    >
      {!list && isLoading
        ? [70, 110, 90, 100, 120].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={40} sx={{ borderRadius: 99, flexShrink: 0 }} />)
        : list && [chip('all', 'All', ''), ...list.map((c) => chip(c.slug, c.name, c.slug))]}
    </Box>
  );
}
