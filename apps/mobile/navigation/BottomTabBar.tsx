import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../icons/Icon';

const ICON_MAP: Record<string, any> = {
  HomeTab: 'Home',
  SplitTab: 'Plus',
  FriendsTab: 'Users',
  BillsTab: 'FileText',
  ProfileTab: 'User',
};

export default function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: 10,
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const tint = isFocused ? colors.foreground : colors.mutedForeground;
        const pillBg = isFocused ? colors.muted : 'transparent';
        const isCenter = route.name === 'SplitTab';

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [{ alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: isCenter ? 16 : 12,
                paddingVertical: isCenter ? 10 : 8,
                borderRadius: radius.lg,
                backgroundColor: pillBg,
              }}
            >
              <Icon name={(ICON_MAP[route.name] ?? 'Circle') as any} color={tint} size={(isCenter ? 26 : 22) as any} />
              <Text style={{ marginTop: 4, color: tint }}>{label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
