'use client';
import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { brand, radius, shadows } from './tokens';

const display = 'var(--font-display), Georgia, "Times New Roman", serif';
const body = 'var(--font-body), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const base: ThemeOptions = {
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  spacing: 8,
  // sx={{ borderRadius: n }} multiplies this base: n=3 -> 12px, 4 -> 16px, 5 -> 20px, 6 -> 24px, 7 -> 28px.
  shape: { borderRadius: 4 },
  palette: {
    mode: 'light',
    primary: { main: brand.navy, dark: brand.navyDark, light: brand.sky, contrastText: '#fff' },
    secondary: { main: brand.greenDark, light: brand.green, contrastText: '#fff' },
    info: { main: brand.sky },
    success: { main: '#2E7D32' },
    background: { default: brand.canvas, paper: brand.paper },
    text: { primary: brand.ink, secondary: brand.muted },
    divider: brand.line,
  },
  typography: {
    fontFamily: body,
    h1: { fontFamily: display, fontWeight: 600, fontSize: 'clamp(2.25rem, 5vw + 1rem, 4rem)', lineHeight: 1.08, letterSpacing: '-0.02em' },
    h2: { fontFamily: display, fontWeight: 600, fontSize: 'clamp(1.75rem, 3vw + 0.75rem, 2.75rem)', lineHeight: 1.12, letterSpacing: '-0.015em' },
    h3: { fontFamily: display, fontWeight: 600, fontSize: 'clamp(1.35rem, 2vw + 0.6rem, 2rem)', lineHeight: 1.2 },
    h4: { fontFamily: display, fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.25 },
    h5: { fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 },
    h6: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.35 },
    subtitle1: { fontSize: '1.0625rem', lineHeight: 1.6, color: brand.muted },
    body1: { fontSize: '1rem', lineHeight: 1.65 },
    body2: { fontSize: '0.9rem', lineHeight: 1.55 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.72rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth', WebkitTextSizeAdjust: '100%' },
        body: { overflowX: 'hidden', WebkitFontSmoothing: 'antialiased', backgroundImage: 'url(/images/molecules.svg)', backgroundRepeat: 'repeat', backgroundSize: '560px 560px', backgroundAttachment: 'fixed' },
        '@media (prefers-reduced-motion: reduce)': { html: { scrollBehavior: 'auto' }, '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' } },
        'a': { color: 'inherit' },
        ':focus-visible': { outline: `3px solid ${brand.sky}`, outlineOffset: 2 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: radius.sm + 2, minHeight: 44, paddingInline: 22 },
        sizeLarge: { minHeight: 52, fontSize: '1rem', paddingInline: 30 },
        sizeSmall: { minHeight: 36 },
        containedPrimary: { '&:hover': { background: brand.navyDark } },
      },
      variants: [
        { props: { variant: 'soft' as never }, style: { background: brand.skyLight, color: brand.navy, '&:hover': { background: '#d3ebf5' } } },
      ],
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { borderRadius: radius.lg, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: radius.lg } } },
    MuiTextField: { defaultProps: { variant: 'outlined', size: 'medium', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: radius.sm + 2, background: '#fff', '& fieldset': { borderColor: '#D3DCE8' }, '&:hover fieldset': { borderColor: brand.sky } },
        input: { paddingBlock: 14 },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: radius.pill, fontWeight: 600 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: radius.lg } } },
    MuiDrawer: { styleOverrides: { paper: { borderTopLeftRadius: 0 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, color: brand.muted, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F1F5FA' } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
};

export const theme = createTheme(base);

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;
  }
}
