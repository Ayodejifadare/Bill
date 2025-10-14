import React from 'react';
import { ScrollView, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function RecurringPaymentsScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText variant="xl">Recurring Payments</ThemedText>
      <Card>
        <ThemedText>No recurring payments yet.</ThemedText>
        <View style={{ height: 8 }} />
        <Button leftIcon="Plus">Create</Button>
      </Card>
    </ScrollView>
  );
}

