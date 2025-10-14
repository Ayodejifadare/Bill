import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { UpcomingPayment } from '../hooks/useUpcomingPayments';
import { Icon } from '../icons/Icon';

export function UpcomingPaymentItem({ item }: { item: UpcomingPayment }) {
  const { colors, typography } = useTheme();
  const icon = item.type === 'bill_split' ? 'Split' : 'HandCoins';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
      <Icon name={icon as any} color={colors.accentForeground} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: typography.sm.fontSize }}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{item.amount}</Text>
    </View>
  );
}

