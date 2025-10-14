import { StyleSheet, TextStyle } from 'react-native';
import { useTheme } from './ThemeContext';

export type TextVariant = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

export function useTextStyle(variant: TextVariant = 'base', extra?: TextStyle) {
  const { typography, colors } = useTheme();
  const t = typography[variant];
  return StyleSheet.flatten([{ fontSize: t.fontSize, lineHeight: t.lineHeight, color: colors.foreground }, extra]);
}

