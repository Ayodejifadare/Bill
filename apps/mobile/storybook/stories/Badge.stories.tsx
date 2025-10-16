import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { Badge } from '../../components/ui/Badge';

storiesOf('Primitives/Badge', module)
  .add('variants', () => (
    <View style={{ padding: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
      <Badge>Default</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Danger</Badge>
    </View>
  ));

