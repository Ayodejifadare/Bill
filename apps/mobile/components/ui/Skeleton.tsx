import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = ViewProps & { height?: number; width?: number; radius?: number };

export function Skeleton({ height = 16, width, radius, style, ...rest }: Props) {
  const { colors, radius: r } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-50, 200] });

  return (
    <View
      style={StyleSheet.flatten([
        styles.base,
        { backgroundColor: colors.muted, height, width, borderRadius: radius ?? r.sm, overflow: 'hidden' },
        style,
      ])}
      {...rest}
    >
      <Animated.View
        style={{
          height: '100%',
          width: 50,
          transform: [{ translateX }],
          backgroundColor: colors.mutedForeground + '33',
          opacity: 0.5,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
  },
});
