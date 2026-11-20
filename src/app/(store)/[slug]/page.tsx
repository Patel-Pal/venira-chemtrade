import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RichText from '@/components/common/RichText';
import { Reveal } from '@/components/animations/Reveal';
import { getPublishedPage } from '@/modules/content/page.service';
import { brand } from '@/theme/tokens';

export const dynamic = 'force-dynamic';
// Pages that have dedicated routes must not be shadowed by this dynamic segment.
const RESERVED = new Set(['contact', 'login', 'register', 'cart', 'checkout', 'wishlist', 'account', 'orders', 'products', 'categories', 'admin', 'super-admin', 'api']);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = RESERVED.has(slug) ? null : await getPublishedPage(slug);
  if (!p) return { title: 'Page not found' };
  return { title: p.seo?.title ?? p.title, description: p.seo?.description, alternates: { canonical: `/${slug}` } };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  const faqJson = page.kind === 'faq' && page.faqs.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 7 } }}>
      {faqJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson).replace(/</g, '\\u003c') }} />}
      <Reveal>
        <Typography variant="overline" color="info.main">{page.kind === 'policy' ? 'Policy' : 'Venira Chemtrade'}</Typography>
        <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, mb: 3 }}>{page.title}</Typography>
      </Reveal>
      {page.content && <RichText text={page.content} />}
      {page.kind === 'faq' && (
        page.faqs.length === 0 ? <Typography color="text.secondary">Frequently asked questions will be published here soon.</Typography> : (
          <Box sx={{ mt: 2 }}>
            {page.faqs.map((f, i) => (
              <Accordion key={i} disableGutters elevation={0} sx={{ border: `1px solid ${brand.line}`, mb: 1.5, borderRadius: '16px !important', '&::before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ fontWeight: 700 }}>{f.question}</Typography></AccordionSummary>
                <AccordionDetails><Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{f.answer}</Typography></AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )
      )}
    </Container>
  );
}
