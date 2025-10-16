import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/ui/Button';
import { useNavigation } from '@react-navigation/native';

export default function SplitScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <ThemedText variant="xl">Split a Bill</ThemedText>
      <ThemedText>
        Start a new split or manage pending ones. This is a placeholder screen — wire it to your split flow.
      </ThemedText>
      <Button leftIcon="Split" onPress={() => navigation.navigate('BillsTab')}>Go to Bills</Button>
    </View>
  );
}

