import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon, IconName } from '../../icons/Icon';

type Props = {
  title: string;
  subtitle?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, leftIcon, rightIcon = 'ChevronRight', onPress }: Props) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && { opacity: 0.95 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {leftIcon ? (
        <View style={{ marginRight: spacing[3] }}>
          <Icon name={leftIcon} size={20} color={colors.mutedForeground} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, lineHeight: typography.base.lineHeight, fontWeight: '600' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: colors.mutedForeground, fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightIcon ? <Icon name={rightIcon} size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

