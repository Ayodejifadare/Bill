import React from 'react';
import RootNavigator from './navigation/RootNavigator';
import { RNQueryProvider } from './state/QueryProvider';

export default function App() {
  return (
    <RNQueryProvider>
      <RootNavigator />
    </RNQueryProvider>
  );
}
