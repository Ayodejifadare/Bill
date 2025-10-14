import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, ThemeMode } from '@shared/theme/tokens';

type ThemePref = ThemeMode | 'system';

type Ctx = {
  theme: ThemePref;
  actualTheme: ThemeMode;
  setTheme: (t: ThemePref) => void;
  colors: typeof tokens.colors.light;
  radius: typeof tokens.radius;
  typography: typeof tokens.typography;
  spacing: typeof tokens.spacing;
};

const STORAGE_KEY = 'biltip-theme';

const ThemeContext = createContext<Ctx | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<ThemePref>('system');
  const [system, setSystem] = useState<ThemeMode>(mapScheme(Appearance.getColorScheme()));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(mapScheme(colorScheme));
    });
    return () => sub.remove();
  }, []);

  const actualTheme: ThemeMode = pref === 'system' ? system : pref;

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, [pref]);

  const value: Ctx = useMemo(() => ({
    theme: pref,
    actualTheme,
    setTheme: setPref,
    colors: tokens.colors[actualTheme],
    radius: tokens.radius,
    typography: tokens.typography,
    spacing: tokens.spacing,
  }), [pref, actualTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function mapScheme(scheme: ColorSchemeName): ThemeMode {
  return scheme === 'dark' ? 'dark' : 'light';
}

