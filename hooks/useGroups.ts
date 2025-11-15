import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../utils/apiClient";

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
  memberIds?: string[];
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

  const mapRawGroup = useCallback((g: any): Group => {
    const getInitials = (name: string | undefined): string => {
      return (name || "")
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
    };
    const membersRaw = Array.isArray(g.members) ? g.members : [];
    const members: string[] = membersRaw.map((m: any) =>
      typeof m === "string" ? m : getInitials(m?.name),
    );
    return {
      id: g.id,
      name: g.name,
      description: g.description || "",
      memberCount:
        typeof g.memberCount === "number" ? g.memberCount : members.length,
      totalSpent: typeof g.totalSpent === "number" ? g.totalSpent : 0,
      recentActivity: g.recentActivity || "",
      members,
      isAdmin: Boolean(g.isAdmin),
      lastActive: g.lastActive ?? null,
      pendingBills: typeof g.pendingBills === "number" ? g.pendingBills : 0,
      color: g.color || "",
    } as Group;
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any;
      try {
        data = await apiClient("/groups?include=members");
      } catch (error) {
        console.warn("/groups?include=members unavailable, falling back", error);
        data = await apiClient("/groups");
      }
      const rawGroups = Array.isArray(data?.groups) ? data.groups : Array.isArray(data) ? data : [];
      const mapped = rawGroups.map((g: any) => mapRawGroup(g));
      setGroups(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [mapRawGroup]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Allow other parts of the app to request a refresh
  useEffect(() => {
    const handler = () => fetchGroups();
    window.addEventListener("groupsUpdated", handler);
    return () => window.removeEventListener("groupsUpdated", handler);
  }, [fetchGroups]);

  const joinGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      const data = await apiClient(`/groups/${groupId}/join`, {
        method: "POST",
      });
      if (data?.group) {
        setGroups((prev) => [...prev, data.group]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group");
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      await apiClient(`/groups/${groupId}/leave`, { method: "POST" });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
    }
  }, []);

  const createGroup = useCallback(
    async (payload: CreateGroupPayload) => {
      setError(null);
      try {
        const data = await apiClient("/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = data.group || data;
        const mapped = raw ? mapRawGroup(raw) : undefined;
        if (mapped) {
          setGroups((prev) => [...prev, mapped]);
          try {
            window.dispatchEvent(new Event("groupsUpdated"));
          } catch (error) {
            console.warn("groupsUpdated dispatch failed", error);
          }
        }
        return mapped;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create group");
        throw err;
      }
    },
    [mapRawGroup],
  );

  return {
    groups,
    loading,
    error,
    refetch: fetchGroups,
    joinGroup,
    leaveGroup,
    createGroup,
  };
}
