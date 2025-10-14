import React from 'react';
import * as L from 'lucide-react-native';
import { useColor } from '../theme/useColor';

export type IconName = keyof typeof L;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 20, color }: Props) {
  const colors = useColor();
  const Cmp = L[name] as unknown as React.ComponentType<{ size?: number; color?: string }>;
  if (!Cmp) return null;
  return <Cmp size={size} color={color ?? colors.foreground} />;
}

