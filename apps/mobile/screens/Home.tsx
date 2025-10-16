import React, { useMemo } from 'react';
import { ScrollView, View, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useUpcomingPayments } from '../hooks/useUpcomingPayments';
import { useTransactions } from '../hooks/useTransactions';
import { UpcomingPaymentItem } from '../components/UpcomingPaymentItem';
import { TransactionItem } from '../components/TransactionItem';
import { NetworkBanner } from '../components/NetworkBanner';
import { Icon } from '../icons/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useUserProfile } from '../state/UserProfileContext';
import { formatCurrencyForRegion } from '../../../utils/regions';

function Avatar({ name }: { name?: string }) {
  const { colors } = useTheme();
  const initials = useMemo(() => {
    if (!name) return 'JD';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0]?.toUpperCase() ?? 'J';
    const last = parts[1]?.[0]?.toUpperCase() ?? 'D';
    return `${first}${last}`;
  }, [name]);
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, tint }: { icon: any; label: string; onPress?: () => void; tint?: string }) {
  const { colors } = useTheme();
  const bg = tint ?? colors.accent;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ alignItems: 'center', width: 72, opacity: pressed ? 0.85 : 1 }]}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.accentForeground} size={24 as any} />
      </View>
      <Text style={{ marginTop: 8, color: colors.mutedForeground }}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { colors, typography } = useTheme();
  const { userProfile, appSettings } = useUserProfile();
  const upcoming = useUpcomingPayments();
  const tx = useTransactions({ limit: 10 });
  const navigation = useNavigation<any>();

  const owed = Math.max(0, tx.summary.netFlow);
  const owe = Math.max(0, -tx.summary.netFlow);

  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={userProfile?.name} />
            <View>
              <Text style={{ color: colors.mutedForeground }}>Hi,</Text>
              <Text style={{ color: colors.foreground, fontSize: typography.lg.fontSize, lineHeight: typography.lg.lineHeight, fontWeight: '700' }}>
                {userProfile?.name || 'John Doe'}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Notifications')} style={{ padding: 8 }}>
            <View>
              <Icon name="Bell" color={colors.foreground} size={22 as any} />
              <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: colors.destructive, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.destructiveForeground, fontSize: 10, fontWeight: '700' }}>3</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Balance Card */}
        <Card>
          <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600', marginBottom: 8 }}>Your Balance</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.success, fontSize: typography.xl.fontSize, lineHeight: typography.xl.lineHeight, fontWeight: '700' }}>
                {formatCurrencyForRegion(appSettings?.region, owed)}
              </Text>
              <Text style={{ color: colors.mutedForeground }}>You are owed</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.destructive, fontSize: typography.xl.fontSize, lineHeight: typography.xl.lineHeight, fontWeight: '700' }}>
                {formatCurrencyForRegion(appSettings?.region, owe)}
              </Text>
              <Text style={{ color: colors.mutedForeground }}>You owe</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View>
          <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600', marginBottom: 8 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <QuickAction icon="Send" label="Send" onPress={() => { /* TODO: navigate to send */ }} />
            <QuickAction icon="HandCoins" label="Request" onPress={() => { /* TODO */ }} />
            <QuickAction icon="Split" label="Split" onPress={() => navigation.navigate('BillsTab')} />
            <QuickAction icon="FileText" label="Bills" onPress={() => navigation.navigate('BillsTab')} />
          </View>
        </View>

        {/* Pending */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>Pending</Text>
          <Pressable onPress={() => navigation.navigate('HomeTab' as never, { screen: 'Pending' } as never)}>
            <Text style={{ color: colors.mutedForeground }}>See All</Text>
          </Pressable>
        </View>
        {upcoming.loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {upcoming.upcomingPayments.slice(0, 3).map((p) => (
              <Card
                key={p.id}
                onPress={() =>
                  navigation.navigate('HomeTab' as never, {
                    screen: 'TransactionDetails',
                    params: { id: p.billSplitId || p.id },
                  } as never)
                }
              >
                <UpcomingPaymentItem item={p} />
                {/* Simple progress bar mock if participants info is available */}
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: 'hidden', marginTop: 8 }}>
                  <View style={{ width: '50%', height: '100%', backgroundColor: colors.foreground, opacity: 0.6 }} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Button variant="primary">Pay Now</Button>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Completed */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground, fontSize: typography.base.fontSize, fontWeight: '600' }}>Completed</Text>
          <Pressable onPress={() => navigation.navigate('HomeTab' as never, { screen: 'Transactions' } as never)}>
            <Text style={{ color: colors.mutedForeground }}>See All</Text>
          </Pressable>
        </View>
        {tx.loading ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={18} />
            <Skeleton height={18} />
            <Skeleton height={18} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tx.transactions.slice(0, 4).map((t) => (
              <Card
                key={t.id}
                onPress={() =>
                  navigation.navigate('HomeTab' as never, {
                    screen: 'TransactionDetails',
                    params: { id: t.id },
                  } as never)
                }
              >
                <TransactionItem item={t} />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
