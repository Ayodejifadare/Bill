import React, { useMemo } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnlineManager } from './useOnlineManager';

// Mobile-friendly retry strategy: exponential backoff with jitter, capped at 30s
const retryDelay = (attempt: number) => {
  const expo = Math.min(1000 * Math.pow(2, attempt), 30_000);
  const jitter = expo * (0.7 + Math.random() * 0.6);
  return Math.floor(jitter);
};

// Configure a single QueryClient instance
const client = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes to reduce refetch churn on mobile
      staleTime: 5 * 60 * 1000,
      // Cache garbage collection after 24 hours
      gcTime: 24 * 60 * 60 * 1000,
      // Retry transient failures a few times with backoff
      retry: 3,
      retryDelay,
      // Mobile apps don't have window focus semantics like web
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// Create an AsyncStorage persister for React Query cache
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'RQ_CACHE_V1',
  throttleTime: 1000,
});

export function RNQueryProvider({ children }: { children: React.ReactNode }) {
  // Wire up React Query onlineManager to React Native NetInfo
  useOnlineManager();

  // Persist config: keep cache up to 24h, allow future busting if needed
  const persistOptions = useMemo(
    () => ({
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: 'v1',
    }),
    []
  );

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
