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

  return { groups, loading, error, refetch: fetchGroups };
}
