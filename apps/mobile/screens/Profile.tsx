import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../components/ThemedText';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText variant="xl">Profile</ThemedText>
    </View>
  );
}

