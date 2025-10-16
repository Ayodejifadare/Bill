import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { Skeleton } from '../../components/ui/Skeleton';

storiesOf('Primitives/Skeleton', module)
  .add('default', () => (
    <View style={{ padding: 16 }}>
      <Skeleton height={20} />
    </View>
  ));

