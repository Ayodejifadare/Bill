import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';
import { RootTabParamList } from '../navigation/types';

type TxRoute = RouteProp<Record<string, { id: string }>, string>;

export default function TransactionDetailsScreen() {
  const route = useRoute<TxRoute>();
  const id = (route.params as any)?.id;
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <ThemedText variant="xl">Transaction</ThemedText>
      <Card>
        <ThemedText>ID: {id || 'Unknown'}</ThemedText>
        <ThemedText>Details coming soon…</ThemedText>
      </Card>
    </View>
  );
}

