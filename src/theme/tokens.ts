/** Design tokens derived from the supplied Venira Chemtrade logo (sampled colours). */
export const brand = {
  navy: '#2B5290',
  navyDark: '#1B3A6B',
  navyDeep: '#10243F',
  sky: '#5DB1CF',
  skyLight: '#E3F2F8',
  green: '#8DC04C',
  greenDark: '#4F7F1F',
  greenLight: '#EEF6E2',
  grey: '#8E8E8E',
  ink: '#12233F',
  muted: '#5B6B82',
  line: '#E3E9F1',
  canvas: '#F5F8FC',
  paper: '#FFFFFF',
} as const;

export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const shadows = {
  soft: '0 1px 2px rgba(16,36,63,0.04), 0 4px 16px rgba(16,36,63,0.06)',
  lift: '0 2px 4px rgba(16,36,63,0.06), 0 12px 32px rgba(16,36,63,0.12)',
  nav: '0 -4px 24px rgba(16,36,63,0.08)',
} as const;

/** Spacing scale is MUI's 8px base: theme.spacing(n). */
export const layout = { maxWidth: 1280, headerHeight: 72, bottomNavHeight: 64 } as const;
