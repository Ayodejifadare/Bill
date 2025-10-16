import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Platform } from 'react-native';
import { ThemedText } from '../components/ThemedText';

export default function QRCodeScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [ScannerCmp, setScannerCmp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Dynamically import to avoid crashing Expo Go when the native module isn't available
        const { BarCodeScanner } = await import('expo-barcode-scanner');
        setScannerCmp(() => BarCodeScanner as unknown as React.ComponentType<any>);
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (e) {
        // If the native module isn't present (older Expo Go), show a friendly message
        setHasPermission(false);
      }
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
        <ThemedText>
          {Platform.OS === 'android' || Platform.OS === 'ios'
            ? 'Camera not available. Update Expo Go or use a development build to scan QR codes.'
            : 'Camera access denied'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {ScannerCmp ? (
      <ScannerCmp
        onBarCodeScanned={({ data }) => {
          setScanned(data);
        }}
        style={{ flex: 1 }}
      />) : null}
      {scanned ? (
        <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Scanned: {scanned}</Text>
        </View>
      ) : null}
    </View>
  );
}
