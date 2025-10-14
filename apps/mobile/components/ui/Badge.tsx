import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = ViewProps & {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
};

export function Badge({ variant = 'default', style, children, ...rest }: Props) {
  const { colors, radius, typography, spacing } = useTheme();
  const { bg, fg, border } = getVariant(variant, colors);
  return (
    <View
      style={StyleSheet.flatten([
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius.md,
          paddingHorizontal: spacing[2],
          paddingVertical: spacing[1],
        },
        style,
      ])}
      {...rest}
    >
      <Text style={{ color: fg, fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight, fontWeight: '600' }}>
        {children}
      </Text>
    </View>
  );
}

function getVariant(variant: Props['variant'], c: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'outline':
      return { bg: 'transparent', fg: c.foreground, border: c.border };
    case 'success':
      return { bg: c.success, fg: c.successForeground, border: c.success };
    case 'warning':
      return { bg: c.warning, fg: c.warningForeground, border: c.warning };
    case 'destructive':
      return { bg: c.destructive, fg: c.destructiveForeground, border: c.destructive };
    case 'default':
    default:
      return { bg: c.accent, fg: c.accentForeground, border: c.border };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});

