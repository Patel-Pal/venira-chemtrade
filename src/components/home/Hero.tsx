'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { brand } from '@/theme/tokens';
import { optimizedImage } from '@/utils/image';

const ease = [0.22, 1, 0.36, 1] as const;

function Hex({ size, color, sx }: { size: number; color: string; sx?: object }) {
  // Decorative hexagon outlines (abstract motif only; the logo itself is never redrawn).
  return (
    <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', width: size, height: size, ...sx }}>
      <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </Box>
  );
}

interface HeroProps {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  stats: { label: string; value: string }[];
}

export default function Hero({ eyebrow, heading, subheading, ctaLabel = 'Browse ingredients', ctaUrl = '/products', imageUrl, stats }: HeroProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const words = heading.split(' ');

  return (
    <Box ref={ref} component="section" aria-labelledby="hero-title" sx={{ position: 'relative', overflow: 'hidden', background: `radial-gradient(1200px 500px at 85% -10%, ${brand.skyLight}, transparent 60%), radial-gradient(900px 500px at -10% 110%, ${brand.greenLight}, transparent 55%), #fff` }}>
      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 5, md: 10 }, display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {eyebrow && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
              <Typography variant="overline" sx={{ color: 'info.main', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 28, height: 2, bgcolor: 'info.main', borderRadius: 1 }} /> {eyebrow}
              </Typography>
            </motion.div>
          )}
          <Typography id="hero-title" variant="h1" component="h1" sx={{ mt: 1.5, color: 'primary.dark' }} aria-label={heading}>
            {words.map((w, i) => (
              <Box key={i} component="span" aria-hidden sx={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', mr: '0.25em' }}>
                <motion.span style={{ display: 'inline-block' }} initial={reduce ? false : { y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.7, delay: 0.08 * i, ease }}>
                  {w}
                </motion.span>
              </Box>
            ))}
          </Typography>
          {subheading && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease }}>
              <Typography variant="subtitle1" sx={{ mt: 2.5, maxWidth: 520 }}>{subheading}</Typography>
            </motion.div>
          )}
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5, ease }}>
            <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button component={Link} href={ctaUrl} variant="contained" size="large" sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>{ctaLabel}</Button>
              <Button component={Link} href="/contact" variant="outlined" size="large" sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>Request a quote</Button>
            </Box>
          </motion.div>
          {stats.length > 0 && (
            <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}>
              <Box sx={{ mt: { xs: 4, md: 6 }, display: 'flex', gap: { xs: 3, md: 5 }, flexWrap: 'wrap' }}>
                {stats.map((s) => (
                  <Box key={s.label}>
                    <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 600, color: 'primary.main', lineHeight: 1 }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </motion.div>
          )}
        </Box>

        <motion.div style={{ y }} initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2, ease }}>
          <Box sx={{ position: 'relative', mx: 'auto', width: '100%', maxWidth: 460, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center' }}>
            <Box sx={{ position: 'absolute', inset: '6%', borderRadius: '50%', background: `linear-gradient(145deg, ${brand.skyLight}, #fff 60%, ${brand.greenLight})`, boxShadow: '0 30px 80px rgba(43,82,144,.18)' }} />
            <motion.div aria-hidden style={{ position: 'absolute', top: '4%', left: '2%' }} animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
              <Hex size={74} color={brand.sky} />
            </motion.div>
            <motion.div aria-hidden style={{ position: 'absolute', bottom: '6%', right: '0%' }} animate={reduce ? undefined : { y: [0, 12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
              <Hex size={96} color={brand.green} />
            </motion.div>
            {imageUrl ? (
              <Box sx={{ position: 'absolute', inset: '10%', borderRadius: '50%', overflow: 'hidden' }}>
                <Image src={optimizedImage(imageUrl, 900) ?? imageUrl} alt="" fill priority sizes="(max-width:900px) 80vw, 420px" style={{ objectFit: 'cover' }} />
              </Box>
            ) : (
              <Box sx={{ position: 'relative', width: '58%', bgcolor: '#fff', borderRadius: 5, p: '4%', boxShadow: '0 20px 60px rgba(43,82,144,.18)', lineHeight: 0 }}>
                <Image src="/images/logo-full.png" alt="Venira Chemtrade - Trusted Chemical Trading Partner" width={264} height={340} priority sizes="(max-width:900px) 60vw, 280px" style={{ width: '100%', height: 'auto' }} />
              </Box>
            )}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
