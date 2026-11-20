'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { get, post } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { brand } from '@/theme/tokens';

interface ReviewsResponse {
  items: { id: string; userName: string; rating: number; title?: string; body: string; verifiedPurchase: boolean; createdAt: string }[];
  total: number;
  stats: { average: number; count: number };
}
const schema = z.object({ rating: z.number().int().min(1, 'Choose a rating').max(5), title: z.string().trim().max(100).optional(), body: z.string().trim().min(5, 'Please write at least 5 characters').max(2000) });
type FormValues = z.infer<typeof schema>;

export default function ProductReviews({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const notify = useUiStore((s) => s.notify);
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: qk.products.reviews(slug, page), queryFn: () => get<ReviewsResponse>(`/api/products/${slug}/reviews`, { page, limit: 5 }) });
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rating: 0, title: '', body: '' } });
  const m = useMutation({
    mutationFn: (v: FormValues) => post<{ message: string }>(`/api/products/${slug}/reviews`, v),
    onSuccess: (r) => { notify(r.message); reset(); qc.invalidateQueries({ queryKey: ['products', 'reviews', slug] }); },
    onError: (e: Error) => notify(e.message, 'error'),
  });

  return (
    <Box id="reviews" sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' } }}>
      <Box>
        <Typography variant="h3" component="h2" sx={{ fontSize: '1.5rem' }}>Customer reviews</Typography>
        {data && data.stats.count > 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '3rem', lineHeight: 1 }}>{data.stats.average.toFixed(1)}</Typography>
            <Rating value={data.stats.average} precision={0.1} readOnly />
            <Typography variant="body2" color="text.secondary">{data.stats.count} {data.stats.count === 1 ? 'review' : 'reviews'}</Typography>
            <LinearProgress variant="determinate" value={(data.stats.average / 5) * 100} sx={{ mt: 1.5, height: 6, borderRadius: 3, maxWidth: 220 }} />
          </Box>
        ) : <Typography color="text.secondary" sx={{ mt: 1 }}>No reviews yet. Be the first to share your experience.</Typography>}

        <Box component="form" onSubmit={handleSubmit((v) => m.mutate(v))} noValidate sx={{ mt: 3, display: 'grid', gap: 1.5 }}>
          <Typography variant="h6" component="h3">Write a review</Typography>
          {status !== 'authenticated' ? (
            <Typography variant="body2">Please <Link href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`} style={{ color: brand.navy, fontWeight: 700 }}>sign in</Link> to write a review.</Typography>
          ) : (
            <>
              <Controller name="rating" control={control} render={({ field }) => <Rating value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} size="large" />} />
              {errors.rating && <Typography color="error" variant="caption">{errors.rating.message}</Typography>}
              <TextField label="Title (optional)" {...register('title')} error={Boolean(errors.title)} />
              <TextField label="Your review" multiline minRows={3} {...register('body')} error={Boolean(errors.body)} helperText={errors.body?.message} />
              <Button type="submit" variant="contained" disabled={m.isPending}>Submit review</Button>
            </>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, alignContent: 'start' }}>
        {data?.items.map((r) => (
          <Box key={r.id} sx={{ p: 2.5, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Rating value={r.rating} readOnly size="small" />
              {r.verifiedPurchase && <Chip size="small" label="Verified purchase" color="success" variant="outlined" />}
            </Box>
            {r.title && <Typography sx={{ fontWeight: 700, mt: 1 }}>{r.title}</Typography>}
            <Typography color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{r.body}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{r.userName} · {new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Typography>
          </Box>
        ))}
        {data && data.total > 5 && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button disabled={data.total <= page * 5} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
