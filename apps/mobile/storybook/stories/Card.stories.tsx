import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { ThemedText } from '../../components/ThemedText';

storiesOf('Primitives/Card', module)
  .add('default', () => (
    <View style={{ padding: 16 }}>
      <Card>
        <ThemedText>Card content</ThemedText>
      </Card>
    </View>
  ));

