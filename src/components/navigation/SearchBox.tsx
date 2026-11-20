'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useSuggestions } from '@/hooks/useCatalog';
import { useRecentSearchStore } from '@/stores/recently-viewed.store';

interface Option {
  kind: 'recent' | 'product' | 'category' | 'search';
  label: string;
  href: string;
}
const passthrough = createFilterOptions<Option>({ stringify: () => '' }); // server already filtered; don't re-filter

export default function SearchBox({ autoFocus = false, onDone, placeholder = 'Search ingredients, SKU or category' }: { autoFocus?: boolean; onDone?: () => void; placeholder?: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const { terms, add } = useRecentSearchStore();
  const { data, isFetching } = useSuggestions(input);

  const options = useMemo<Option[]>(() => {
    const q = input.trim();
    if (q.length < 2) return terms.map((t) => ({ kind: 'recent', label: t, href: `/products?q=${encodeURIComponent(t)}` }));
    const items: Option[] = [{ kind: 'search', label: `Search for "${q}"`, href: `/products?q=${encodeURIComponent(q)}` }];
    data?.categories.forEach((c) => items.push({ kind: 'category', label: c.name, href: `/products?category=${c.slug}` }));
    data?.products.forEach((p) => items.push({ kind: 'product', label: p.name, href: `/products/${p.slug}` }));
    return items;
  }, [input, terms, data]);

  const go = (o: Option | string | null) => {
    if (!o) return;
    if (typeof o === 'string') {
      const q = o.trim();
      if (q.length < 1) return;
      add(q);
      router.push(`/products?q=${encodeURIComponent(q)}`);
    } else {
      if (o.kind === 'recent' || o.kind === 'search') add(o.kind === 'search' ? input : o.label);
      router.push(o.href);
    }
    setInput('');
    onDone?.();
  };

  return (
    <Autocomplete<Option, false, false, true>
      freeSolo
      openOnFocus
      fullWidth
      options={options}
      filterOptions={passthrough}
      inputValue={input}
      onInputChange={(_, v, reason) => reason !== 'reset' && setInput(v)}
      onChange={(_, v) => go(v)}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label)}
      groupBy={(o) => (o.kind === 'recent' ? 'Recent searches' : o.kind === 'category' ? 'Categories' : o.kind === 'product' ? 'Ingredients' : '')}
      loading={isFetching}
      slotProps={{ paper: { sx: { borderRadius: 3, mt: 0.5, boxShadow: '0 12px 40px rgba(16,36,63,.18)' } } }}
      noOptionsText={input.trim().length < 2 ? 'Type at least 2 characters' : 'No matches found'}
      renderOption={(props, o) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        const Icon = o.kind === 'recent' ? HistoryIcon : o.kind === 'category' ? CategoryOutlinedIcon : o.kind === 'product' ? ScienceOutlinedIcon : SearchIcon;
        return (
          <Box component="li" key={key} {...rest} sx={{ gap: 1.5, minHeight: 48 }}>
            <Icon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ fontWeight: o.kind === 'search' ? 700 : 500 }}>{o.label}</Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search products"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              go(input);
            }
          }}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 99, bgcolor: '#F1F5FA', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: 'info.main' } }, '& input': { py: '10px !important' } }}
        />
      )}
      clearOnBlur={false}
    />
  );
}
