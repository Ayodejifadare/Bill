import React from 'react';
import { Image, ImageProps, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = Omit<ImageProps, 'source'> & {
  uri?: string;
  name?: string;
  size?: number;
};

export function Avatar({ uri, name, size = 40, style, ...rest }: Props) {
  const { colors } = useTheme();
  const initials = name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={StyleSheet.flatten([{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted }, style])}
        {...rest}
      />
    );
  }

  return (
    <View
      style={StyleSheet.flatten([
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent },
        style,
      ])}
    >
      <Text style={{ color: colors.accentForeground, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

