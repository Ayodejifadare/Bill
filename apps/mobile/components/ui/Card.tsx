import React from 'react';
import { Pressable, PressableProps, StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = ViewProps & {
  onPress?: PressableProps['onPress'];
};

export function Card({ style, children, onPress, ...rest }: Props) {
  const { colors, radius, spacing } = useTheme();
  const content = (
    <View
      style={StyleSheet.flatten([
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing[4],
        },
        style,
      ])}
      {...rest}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}> {content} </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

