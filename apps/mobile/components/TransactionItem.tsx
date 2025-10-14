import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Transaction } from '../hooks/useTransactions';
import { Icon } from '../icons/Icon';

export function TransactionItem({ item }: { item: Transaction }) {
  const { colors, typography } = useTheme();
  const sign = item.type === 'received' ? '+' : '-';
  const color = item.type === 'received' ? colors.success : colors.destructive;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
      <Icon name={item.type === 'received' ? 'ArrowDownRight' : 'ArrowUpRight'} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>{item.description || item.type}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: typography.sm.fontSize }}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={{ color, fontSize: typography.base.fontSize, fontWeight: '700' }}>
        {sign}{item.amount}
      </Text>
    </View>
  );
}

