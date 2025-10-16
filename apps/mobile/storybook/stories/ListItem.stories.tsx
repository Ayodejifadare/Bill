import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { ListItem } from '../../components/ui/ListItem';

storiesOf('Primitives/ListItem', module)
  .add('default', () => (
    <View style={{ padding: 16 }}>
      <ListItem title="Payments" subtitle="Manage your payment methods" leftIcon="CreditCard" />
    </View>
  ));

