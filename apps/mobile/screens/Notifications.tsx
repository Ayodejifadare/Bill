import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Button } from '../components/ui/Button';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';

export default function NotificationsScreen() {
  const [status, setStatus] = useState<'undetermined'|'granted'|'denied'>('undetermined');

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setStatus(p.status));
  }, []);

  const request = async () => {
    const res = await Notifications.requestPermissionsAsync();
    setStatus(res.status);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText variant="xl">Notifications</ThemedText>
      <Card>
        <ThemedText>Permission: {status}</ThemedText>
        {status !== 'granted' ? <View style={{ height: 8 }} /> : null}
        {status !== 'granted' ? <Button onPress={request}>Enable</Button> : null}
      </Card>
      <Card>
        <ThemedText>Recent</ThemedText>
        <Text>No notifications yet.</Text>
      </Card>
    </ScrollView>
  );
}

