import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { useUpcomingPayments, UpcomingPayment } from '../hooks/useUpcomingPayments';
import { useUserProfile } from '../state/UserProfileContext';
import { formatCurrencyForRegion } from '../../../utils/regions';

function Avatar({ name }: { name?: string }) {
  const { colors } = useTheme();
  const initials = useMemo(() => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0]?.toUpperCase() ?? '?';
    const last = parts[1]?.[0]?.toUpperCase() ?? '';
    return `${first}${last}`;
  }, [name]);
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

function PendingCard({ item }: { item: UpcomingPayment }) {
  const { colors, typography, radius } = useTheme();
  const nav = useNavigation<any>();
  const isIncoming = (item.amount ?? 0) > 0 || item.type === 'request';
  const color = isIncoming ? colors.success : colors.destructive;
  const sign = isIncoming ? '+' : '-';
  const paidCount = Array.isArray(item.participants) ? Math.floor(item.participants.length / 2) : 2;
  const totalCount = Array.isArray(item.participants) ? item.participants.length : 4;
  const pct = Math.round((paidCount / Math.max(1, totalCount)) * 100);

  return (
    <Card onPress={() => nav.navigate('TransactionDetails', { id: item.billSplitId || item.id })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar name={item.organizer?.name} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, lineHeight: typography.base.lineHeight, fontWeight: '700' }}>
              {item.organizer?.name || item.title}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>{item.title}</Text>
            {item.status === 'overdue' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground }}>Oct 7</Text>
                <View style={{ backgroundColor: colors.destructive, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                  <Text style={{ color: colors.destructiveForeground, fontWeight: '700' }}>Overdue</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={{ color, fontSize: typography.base.fontSize, fontWeight: '700' }}>
          {sign}{formatCurrencyForRegion('NG', Math.abs(item.amount ?? 0)).replace(/^[^\d+-]*/, '')}
        </Text>
      </View>

      {/* Progress */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: colors.mutedForeground }}>2 of 4 paid</Text>
        <Text style={{ color: colors.mutedForeground }}>{pct}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: 'hidden', marginTop: 6 }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.foreground, opacity: 0.6 }} />
      </View>

      {/* Actions */}
      {isIncoming ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Button variant="primary">Cancel</Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary">Remind</Button>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <Button variant="primary">Pay Now</Button>
        </View>
      )}
    </Card>
  );
}

export default function PendingScreen() {
  const { colors, typography } = useTheme();
  const { appSettings } = useUserProfile();
  const upcoming = useUpcomingPayments();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>Pending</Text>
        <Text style={{ color: colors.mutedForeground }}>See All</Text>
      </View>

      {upcoming.loading ? (
        <ThemedText>Loading…</ThemedText>
      ) : (
        <View style={{ gap: 12 }}>
          {upcoming.upcomingPayments.map((p) => (
            <PendingCard key={p.id} item={p} />
          ))}
        </View>
      )}
    </View>
  );
}

