import { useTheme } from './ThemeContext';

export function useColor() {
  const { colors } = useTheme();
  return colors;
}

