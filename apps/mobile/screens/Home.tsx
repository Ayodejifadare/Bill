import React from 'react';
import { FlatList, ScrollView, View, Pressable } from 'react-native';
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

export default function HomeScreen() {
  const upcoming = useUpcomingPayments();
  const tx = useTransactions({ limit: 10 });
  const navigation = useNavigation<any>();
  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <ThemedText variant="xl">Welcome</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button leftIcon="Send">Send</Button>
          <Button variant="secondary" leftIcon="HandCoins">Request</Button>
          <Button variant="ghost" leftIcon="Split">Split</Button>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button leftIcon="Bell" onPress={() => navigation.navigate('Notifications')}>Notifications</Button>
          <Button leftIcon="Repeat" variant="secondary" onPress={() => navigation.navigate('RecurringPayments')}>Recurring</Button>
        </View>
        <Card>
          <ThemedText variant="lg">Upcoming payments</ThemedText>
          {upcoming.loading ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              <Skeleton height={18} />
              <Skeleton height={18} />
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {upcoming.upcomingPayments.slice(0, 5).map((p) => (
                <Pressable key={p.id} onPress={() => navigation.navigate('TransactionDetails', { id: p.billSplitId || p.id })}>
                  <UpcomingPaymentItem item={p} />
                </Pressable>
              ))}
            </View>
          )}
        </Card>
        <Card>
          <ThemedText variant="lg">Recent transactions</ThemedText>
          {tx.loading ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} />
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {tx.transactions.map((t) => (
                <Pressable key={t.id} onPress={() => navigation.navigate('TransactionDetails', { id: t.id })}>
                  <TransactionItem item={t} />
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
