import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../utils/apiClient";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  status: "active" | "pending" | "blocked";
}

let friendsCache: Friend[] | null = null;
let inflight: Promise<Friend[]> | null = null;

export async function fetchFriends(): Promise<Friend[]> {
  if (friendsCache) return friendsCache;
  if (inflight) return inflight;
  inflight = apiClient("/friends")
    .then((data) => {
      const raw = Array.isArray(data.friends) ? data.friends : [];
      // Normalize server payloads that don't include a status field
      const normalized: Friend[] = raw.map((f: any) => ({
        id: String(f.id),
        name: f.name,
        avatar: f.avatar,
        phoneNumber: f.phoneNumber || f.phone,
        status: (f.status as Friend["status"]) || "active",
      }));
      friendsCache = normalized.filter((f) => f.status === "active");
      return friendsCache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight!;
}

export function getCachedFriends(): Friend[] | null {
  return friendsCache ? [...friendsCache] : null;
}

export function invalidateFriendsCache() {
  friendsCache = null;
  window.dispatchEvent(new Event("friendsUpdated"));
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
      setError(err instanceof Error ? err.message : "Failed to fetch friends");
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
    window.addEventListener("friendsUpdated", handleUpdate);
    return () => window.removeEventListener("friendsUpdated", handleUpdate);
  }, []);

  return { friends, loading, error, refetch: load };
}
