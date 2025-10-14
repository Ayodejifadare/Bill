import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '../components/ThemedText';
import { Card } from '../components/ui/Card';

const KEY = 'qr-share-id';

export default function QRCodeShareScreen() {
  const [value, setValue] = useState<string>('');
  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem(KEY);
      if (existing) return setValue(existing);
      const gen = 'uid_' + Math.random().toString(36).slice(2, 10);
      await AsyncStorage.setItem(KEY, gen);
      setValue(gen);
    })();
  }, []);
  return (
    <View style={{ flex: 1, padding: 16, gap: 12, alignItems: 'center' }}>
      <ThemedText variant="xl">My QR</ThemedText>
      <Card style={{ alignItems: 'center' }}>
        {value ? <QRCode value={value} size={200} /> : null}
        <ThemedText>Share this to receive payments</ThemedText>
      </Card>
    </View>
  );
}

