import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Minimal, XSS-safe text renderer for admin-managed content. Supports "## Heading", "- bullet" lists and paragraphs.
 * Nothing is ever injected as HTML; React escapes all text.
 */
export default function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {blocks.map((b, i) => {
        if (b.startsWith('## ')) return <Typography key={i} variant="h4" component="h2" sx={{ mt: 2 }}>{b.slice(3)}</Typography>;
        const lines = b.split('\n');
        if (lines.every((l) => l.startsWith('- '))) {
          return <Box key={i} component="ul" sx={{ m: 0, pl: 3 }}>{lines.map((l, j) => <li key={j}><Typography>{l.slice(2)}</Typography></li>)}</Box>;
        }
        return <Typography key={i} sx={{ whiteSpace: 'pre-line', color: 'text.secondary', fontSize: '1.02rem' }}>{b}</Typography>;
      })}
    </Box>
  );
}
