import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Subscribes React Query's onlineManager to React Native NetInfo events
 * so queries pause when offline and resume when connectivity returns.
 */
export function useOnlineManager() {
  useEffect(() => {
    // Initialize with current connectivity state
    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      onlineManager.setOnline(online);
    });

    // Subscribe to future connectivity changes
    const unsubscribe = onlineManager.setEventListener((setOnline) => {
      const remove = NetInfo.addEventListener((state) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        setOnline(online);
      });
      return () => remove();
    });

    return () => {
      unsubscribe?.();
    };
  }, []);
}

