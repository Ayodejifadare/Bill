import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { ThemedText } from '../components/ThemedText';

export default function QRCodeScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText>Requesting camera permission…</ThemedText>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText>Camera access denied</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={({ data }) => {
          setScanned(data);
        }}
        style={{ flex: 1 }}
      />
      {scanned ? (
        <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Scanned: {scanned}</Text>
        </View>
      ) : null}
    </View>
  );
}

