import { useEffect, useState, useCallback } from 'react';

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalSpent: number;
  recentActivity: string;
  members: Array<{
    name: string;
    avatar: string;
  }>;
  isAdmin: boolean;
  lastActive: string;
  pendingBills: number;
  color: string;
}

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

export function useGroups(): UseGroupsResult {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/groups');
      if (!res.ok) {
        throw new Error('Failed to fetch groups');
      }
      const data = await res.json();
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const joinGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to join group');
      }
      const data = await res.json();
      if (data.group) {
        setGroups(prev => [...prev, data.group]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to leave group');
      }
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    }
  }, []);

  return { groups, loading, error, refetch: fetchGroups, joinGroup, leaveGroup };
}
