import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';

export default function SetupRecurringPaymentScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <ThemedText variant="xl">New Recurring Payment</ThemedText>
      <Card>
        <ThemedText>Form coming soon…</ThemedText>
      </Card>
    </View>
  );
}

