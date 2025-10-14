export type ThemeMode = 'light' | 'dark';

export type ColorTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  inputBackground: string;
  switchBackground: string;
  ring: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type RadiusTokens = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type TypographyScale = {
  xs: { fontSize: number; lineHeight: number };
  sm: { fontSize: number; lineHeight: number };
  base: { fontSize: number; lineHeight: number };
  lg: { fontSize: number; lineHeight: number };
  xl: { fontSize: number; lineHeight: number };
  ['2xl']: { fontSize: number; lineHeight: number };
  ['3xl']: { fontSize: number; lineHeight: number };
};

export type SpacingScale = Record<
  0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
  number
>;

export interface ThemeTokens {
  colors: Record<ThemeMode, ColorTokens>;
  radius: RadiusTokens;
  typography: TypographyScale;
  spacing: SpacingScale;
}

// Extracted from styles/globals.css CSS variables
export const tokens: ThemeTokens = {
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#0a0a0a',
      card: '#ffffff',
      cardForeground: '#0a0a0a',
      popover: '#ffffff',
      popoverForeground: '#0a0a0a',
      primary: '#000000',
      primaryForeground: '#ffffff',
      secondary: '#f4f4f5',
      secondaryForeground: '#0a0a0a',
      muted: '#f4f4f5',
      mutedForeground: '#71717a',
      accent: '#f4f4f5',
      accentForeground: '#0a0a0a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e5e5e5',
      input: '#e5e5e5',
      inputBackground: '#ffffff',
      switchBackground: '#e5e5e5',
      ring: '#0a0a0a',
      success: '#10b981',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#0a0a0a',
      chart1: '#3b82f6',
      chart2: '#10b981',
      chart3: '#f59e0b',
      chart4: '#ef4444',
      chart5: '#8b5cf6',
      sidebar: '#ffffff',
      sidebarForeground: '#0a0a0a',
      sidebarPrimary: '#0a0a0a',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#f4f4f5',
      sidebarAccentForeground: '#0a0a0a',
      sidebarBorder: '#e5e5e5',
      sidebarRing: '#0a0a0a',
    },
    dark: {
      background: '#09090b',
      foreground: '#ffffff',
      card: '#0a0a0a',
      cardForeground: '#ffffff',
      popover: '#0a0a0a',
      popoverForeground: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#000000',
      secondary: '#1a1a1a',
      secondaryForeground: '#ffffff',
      muted: '#1a1a1a',
      mutedForeground: '#a3a3a3',
      accent: '#262626',
      accentForeground: '#ffffff',
      destructive: '#dc2626',
      destructiveForeground: '#ffffff',
      border: '#262626',
      input: '#1a1a1a',
      inputBackground: '#1a1a1a',
      switchBackground: '#404040',
      ring: '#ffffff',
      success: '#059669',
      successForeground: '#ffffff',
      warning: '#d97706',
      warningForeground: '#ffffff',
      chart1: '#60a5fa',
      chart2: '#34d399',
      chart3: '#fbbf24',
      chart4: '#f87171',
      chart5: '#a78bfa',
      sidebar: '#0a0a0a',
      sidebarForeground: '#ffffff',
      sidebarPrimary: '#ffffff',
      sidebarPrimaryForeground: '#000000',
      sidebarAccent: '#1a1a1a',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#262626',
      sidebarRing: '#ffffff',
    },
  },
  radius: {
    // --radius is 0.5rem (~8); +/- 2 and 4
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
  },
  typography: {
    // Map to typical RN font sizes; line height ~ 1.3x
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 22 },
    lg: { fontSize: 18, lineHeight: 24 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 38 },
  },
  spacing: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
  },
};

export type Theme = typeof tokens;

