import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalSpent: number;
  recentActivity: string;
  members: string[];
  isAdmin: boolean;
  lastActive: string | null;
  pendingBills: number;
  color: string;
}

interface CreateGroupPayload {
  name: string;
  description: string;
  color: string;
  memberIds: string[];
}

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  createGroup: (payload: CreateGroupPayload) => Promise<Group | undefined>;
}

export function useGroups(): UseGroupsResult {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient('/groups');
      const rawGroups = Array.isArray(data.groups) ? data.groups : [];

      const getInitials = (name: string | undefined): string => {
        return (name || '')
          .split(/\s+/)
          .map(n => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();
      };

      const mapped = rawGroups.map((g: any) => {
        const membersRaw = Array.isArray(g.members) ? g.members : [];
        const members: string[] = membersRaw.map((m: any) =>
          typeof m === 'string' ? m : getInitials(m?.name)
        );
        return {
          id: g.id,
          name: g.name,
          members,
          color: g.color || '',
          description: '',
          memberCount: members.length,
          totalSpent: 0,
          recentActivity: '',
          isAdmin: false,
          lastActive: null,
          pendingBills: 0
        } as Group;
      });
      setGroups(mapped);
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
      const data = await apiClient(`/groups/${groupId}/join`, { method: 'POST' });
      if (data?.group) {
        setGroups(prev => [...prev, data.group]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      await apiClient(`/groups/${groupId}/leave`, { method: 'POST' });
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    }
  }, []);

  const createGroup = useCallback(async (payload: CreateGroupPayload) => {
    setError(null);
    try {
      const data = await apiClient('/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newGroup: Group | undefined = data.group || data;
      if (newGroup) {
        setGroups(prev => [...prev, newGroup]);
      }
      return newGroup;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
      throw err;
    }
  }, []);

  return { groups, loading, error, refetch: fetchGroups, joinGroup, leaveGroup, createGroup };
}
