import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useQuery } from '@tanstack/react-query';
import { RNQueryProvider } from '../state/QueryProvider';

// Mock NetInfo to control connectivity state
const listeners: Array<(s: any) => void> = [];
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (fn: (state: any) => void) => {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
  fetch: jest.fn(),
}));

const emit = (state: any) => listeners.forEach((l) => l(state));

function TestQuery({ fn }: { fn: jest.Mock<any, any> }) {
  useQuery({ queryKey: ['offline-test'], queryFn: fn });
  return null;
}

describe('React Query onlineManager with NetInfo', () => {
  it('does not run queries while offline, resumes when online', async () => {
    const fetchSpy = jest.fn().mockResolvedValue('ok');
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    await act(async () => {
      renderer.create(
        <RNQueryProvider>
          <TestQuery fn={fetchSpy} />
        </RNQueryProvider>
      );
      await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      emit({ isConnected: true, isInternetReachable: true });
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

