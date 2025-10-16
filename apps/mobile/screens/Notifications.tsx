import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Button } from '../components/ui/Button';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';

type ExpoNotifications = typeof import('expo-notifications');

export default function NotificationsScreen() {
  const [status, setStatus] = useState<'undetermined'|'granted'|'denied'>('undetermined');
  const [NotificationsAPI, setNotificationsAPI] = useState<ExpoNotifications | null>(null);

  useEffect(() => {
    // In Expo Go (Android), push notifications aren't supported
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo && Platform.OS === 'android') {
      setStatus('denied');
      return;
    }
    // Dynamically import to avoid initializing the module in Expo Go
    (async () => {
      const mod = await import('expo-notifications');
      setNotificationsAPI(mod);
      const p = await mod.getPermissionsAsync();
      setStatus(p.status);
    })();
  }, []);

  const request = async () => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo && Platform.OS === 'android') {
      setStatus('denied');
      return;
    }
    const api = NotificationsAPI ?? (await import('expo-notifications'));
    const res = await api.requestPermissionsAsync();
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
