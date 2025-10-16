import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';

storiesOf('Primitives/Avatar', module)
  .add('sizes', () => (
    <View style={{ padding: 16, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
      <Avatar name="Jane Doe" />
      <Avatar name="John Smith" size={32} />
    </View>
  ));

