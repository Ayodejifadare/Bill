import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { Button } from '../../components/ui/Button';

storiesOf('Primitives/Button', module)
  .add('variants', () => (
    <View style={{ padding: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
    </View>
  ));

