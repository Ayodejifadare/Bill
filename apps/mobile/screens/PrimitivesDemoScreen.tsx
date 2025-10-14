import React from 'react';
import { ScrollView, View } from 'react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ListItem } from '../components/ui/ListItem';
import { Skeleton } from '../components/ui/Skeleton';

export default function PrimitivesDemoScreen() {
  return (
    <ThemeProvider>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <ThemedText variant="xl">Primitives</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </View>
        <Card>
          <ThemedText>Card content</ThemedText>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Badge>Default</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Danger</Badge>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Avatar name="Jane Doe" />
          <Avatar name="John Smith" size={32} />
        </View>
        <ListItem title="Payments" subtitle="Manage your payment methods" leftIcon="CreditCard" />
        <Skeleton height={20} />
      </ScrollView>
    </ThemeProvider>
  );
}

