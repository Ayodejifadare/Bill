import { useState, useEffect, useCallback } from 'react';

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
}

let friendsCache: Friend[] | null = null;
let inflight: Promise<Friend[]> | null = null;

export async function fetchFriends(): Promise<Friend[]> {
  if (friendsCache) return friendsCache;
  if (inflight) return inflight;
  inflight = fetch('/api/friends')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch friends');
      }
      const data = await res.json();
      friendsCache = Array.isArray(data.friends) ? data.friends : [];
      return friendsCache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateFriendsCache() {
  friendsCache = null;
  window.dispatchEvent(new Event('friendsUpdated'));
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>(friendsCache || []);
  const [loading, setLoading] = useState(!friendsCache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFriends();
      setFriends(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
      setFriends([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!friendsCache) {
      load();
    }
  }, [load]);

  useEffect(() => {
    const handleUpdate = () => {
      if (friendsCache) {
        setFriends([...friendsCache]);
      }
    };
    window.addEventListener('friendsUpdated', handleUpdate);
    return () => window.removeEventListener('friendsUpdated', handleUpdate);
  }, []);

  return { friends, loading, error, refetch: load };
}

