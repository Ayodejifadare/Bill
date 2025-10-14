import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Icon, IconName } from '../../icons/Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'style'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  children?: React.ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  children,
  ...rest
}: Props) {
  const { colors, radius, typography, spacing } = useTheme();

  const { bg, fg, border } = getColors(variant, colors);
  const { padV, padH, font } = getSize(size, typography, spacing);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.6 : 1,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: radius.md,
        },
        pressed && { opacity: 0.85 },
      ]}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {leftIcon && !loading ? (
            <Icon name={leftIcon} size={18} color={fg} />
          ) : null}
          {typeof children === 'string' ? (
            <Text style={[styles.label, { color: fg, fontSize: font.fontSize, lineHeight: font.lineHeight }]}>
              {children}
            </Text>
          ) : (
            children
          )}
          {loading ? <ActivityIndicator color={fg} size="small" /> : rightIcon ? <Icon name={rightIcon} size={18} color={fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

function getColors(variant: Variant, c: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'primary':
      return { bg: c.primary, fg: c.primaryForeground, border: c.primary };
    case 'secondary':
      return { bg: c.secondary, fg: c.secondaryForeground, border: c.border };
    case 'destructive':
      return { bg: c.destructive, fg: c.destructiveForeground, border: c.destructive };
    case 'ghost':
    default:
      return { bg: 'transparent', fg: c.foreground, border: c.border };
  }
}

function getSize(size: Size, t: any, s: any) {
  switch (size) {
    case 'sm':
      return { padV: s[1.5], padH: s[3], font: t.sm };
    case 'lg':
      return { padV: s[2.5], padH: s[5], font: t.lg };
    case 'md':
    default:
      return { padV: s[2], padH: s[4], font: t.base };
  }
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
});

