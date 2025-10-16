import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../icons/Icon';
import { useTransactions } from '../hooks/useTransactions';
import { useUserProfile } from '../state/UserProfileContext';
import { formatCurrencyForRegion } from '../../../utils/regions';
import { useNavigation } from '@react-navigation/native';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function Row({ item }: { item: ReturnType<typeof useTransactions>['transactions'][number] }) {
  const { colors, typography } = useTheme();
  const { appSettings } = useUserProfile();
  const nav = useNavigation<any>();
  const isIncoming = item.type === 'received';
  const tint = isIncoming ? colors.success : colors.destructive;
  const sign = isIncoming ? '+' : '-';
  const name = item.user?.name || item.sender?.name || item.recipient?.name || '—';

  return (
    <Card onPress={() => nav.navigate('TransactionDetails', { id: item.id })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View>
            <Avatar name={name} size={44} />
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={(isIncoming ? 'ArrowDownRight' : 'ArrowUpRight') as any} color={tint} size={16 as any} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, lineHeight: typography.base.lineHeight, fontWeight: '700' }}>{name}</Text>
            <Text style={{ color: colors.mutedForeground }}>{item.description || item.type}</Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <Text style={{ color: tint, fontSize: typography.base.fontSize, fontWeight: '700' }}>
          {sign}{formatCurrencyForRegion(appSettings?.region, Math.abs(item.amount)).replace(/^[^\d+-]*/, '')}
        </Text>
      </View>
    </Card>
  );
}

export default function TransactionsScreen() {
  const { colors, typography } = useTheme();
  const tx = useTransactions({ limit: 50 });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>Transactions</Text>
      </View>
      {tx.loading ? (
        <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {tx.transactions.map((t) => (
            <Row key={t.id} item={t} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

