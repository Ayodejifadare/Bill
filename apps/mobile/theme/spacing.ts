import { useTheme } from './ThemeContext';

export function useSpacing() {
  const { spacing } = useTheme();
  return spacing;
}

