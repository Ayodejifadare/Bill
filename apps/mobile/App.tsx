import React from 'react';
import RootNavigator from './navigation/RootNavigator';
import { RNQueryProvider } from './state/QueryProvider';
import { UserProfileProvider } from './state/UserProfileContext';

export default function App() {
  return (
    <RNQueryProvider>
      <UserProfileProvider>
        <RootNavigator />
      </UserProfileProvider>
    </RNQueryProvider>
  );
}
