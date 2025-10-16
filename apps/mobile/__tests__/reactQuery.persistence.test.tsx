import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useQuery } from '@tanstack/react-query';
import { RNQueryProvider } from '../state/QueryProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock NetInfo as online by default
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => {},
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

function DataView({ label, fn }: { label: string; fn: () => Promise<any> }) {
  const { data } = useQuery({ queryKey: ['persisted', label], queryFn: fn });
  // Render the data to be asserted in tests
  return data ? <>{String(data)}</> : null;
}

describe('React Query persistence with AsyncStorage', () => {
  it('hydrates cached data on app relaunch without refetch when fresh', async () => {
    await AsyncStorage.clear();

    // First render: fetch and persist data
    const fetchOnce = jest.fn().mockResolvedValue('hello');
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <RNQueryProvider>
          <DataView label="v1" fn={fetchOnce} />
        </RNQueryProvider>
      );
      await Promise.resolve();
    });
    expect(fetchOnce).toHaveBeenCalledTimes(1);

    // Unmount to simulate app close
    await act(async () => {
      tree.unmount();
    });

    // Second render: expect hydration provides data without fetching
    const fetchSecond = jest.fn().mockResolvedValue('should-not-be-called');
    let second: any;
    await act(async () => {
      second = renderer.create(
        <RNQueryProvider>
          <DataView label="v1" fn={fetchSecond} />
        </RNQueryProvider>
      );
      await Promise.resolve();
    });

    // Should use hydrated cache (staleTime = 5m), so no refetch yet
    expect(fetchSecond).toHaveBeenCalledTimes(0);
    // Confirm rendered output is the persisted value
    const output = second.toJSON();
    expect(output).toBe('hello');

    await act(async () => {
      second.unmount();
    });
  });
});
