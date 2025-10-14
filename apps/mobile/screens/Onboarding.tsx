import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/ui/Button';

const KEY = 'onboarding-complete';

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: 'Welcome to Biltip', body: 'Split, send, and track payments with friends.' },
    { title: 'Stay in sync', body: 'Connect contacts and get notified on due payments.' },
    { title: 'You are in control', body: 'Manage spending insights and security preferences.' },
  ];
  const end = async () => {
    await AsyncStorage.setItem(KEY, '1');
    onDone();
  };
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : end());
  const s = steps[step];

  return (
    <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ThemedText variant="xl">{s.title}</ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{s.body}</ThemedText>
      <Button onPress={next}>{step < steps.length - 1 ? 'Next' : 'Get Started'}</Button>
    </View>
  );
}

export async function isOnboardingComplete() {
  const v = await AsyncStorage.getItem(KEY);
  return v === '1';
}

