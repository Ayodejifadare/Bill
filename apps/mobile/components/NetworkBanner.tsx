import React, { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function NetworkBanner() {
  const { colors, typography } = useTheme();
  const [visible, setVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const translateY = new Animated.Value(-50);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      setVisible(!online);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(translateY, { toValue: visible ? 0 : -50, duration: 200, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}> 
      <View style={[styles.banner, { backgroundColor: colors.destructive }]}> 
        <Text style={{ color: colors.destructiveForeground, fontSize: typography.sm.fontSize, fontWeight: '600' }}>
          You are offline. Some features may be unavailable.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  banner: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});

