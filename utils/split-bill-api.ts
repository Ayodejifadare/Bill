﻿
// Part1

// Part2

// Typed API utilities for SplitBill component with simple in-memory caching
// to avoid repeated network calls when navigating between screens.
//
// These helpers originally returned mocked data with simulated latency. They
// now call the real API endpoints while preserving the same caching behaviour
// so navigation between screens doesn't trigger redundant network requests.

import {
  fetchFriends as fetchFriendsApi,
  getCachedFriends,
  Friend,
} from "../hooks/useFriends";
import { apiClient } from "./apiClient";

export interface Group {
  id: string;
  name: string;
  members: Friend[];
  color: string;
}

export interface ExternalAccount {
  id: string;
  name: string;
  type: "bank" | "mobile_money";
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: "checking" | "savings";
  provider?: string;
  phoneNumber?: string;
  isDefault: boolean;
  createdBy: string;
  createdDate: string;
}
function mapMemberToFriend(member: any): Friend | null {
  try {
    if (!member || typeof member !== "object") return null;
    const u = (member as any).user;
    if (u && typeof u === "object") {
      const id = (u as any).id != null ? String((u as any).id) : undefined;
      const name = (u as any).name ?? "Unknown";
      if (!id) return null;
      return {
        id,
        name,
        avatar: (u as any).avatar,
        phoneNumber: (u as any).phone,
        status: "active",
      } as Friend;
    }
    const id = (member as any).id != null ? String((member as any).id) : undefined;
    const name = (member as any).name ?? "Unknown";
    if (!id) return null;
    return {
      id,
      name,
      avatar: (member as any).avatar,
      phoneNumber: (member as any).phoneNumber || (member as any).phone,
      status: "active",
    } as Friend;
  } catch {
    return null;
  }
}

let groupsCache: Group[] | null = null;
const groupMembersCache = new Map<string, Friend[]>();
const externalAccountsCache = new Map<string, ExternalAccount[]>();

export type { Friend } from "../hooks/useFriends";
export async function fetchFriends(): Promise<Friend[]> { return fetchFriendsApi(); }
export { getCachedFriends };
export function getCachedGroups(): Group[] | null {
  return groupsCache ? [...groupsCache] : null;
}
export async function fetchGroups(): Promise<Group[]> {
  if (groupsCache) return groupsCache;
  const data = await apiClient("/groups");
  const rawGroups = Array.isArray((data as any)?.groups) ? (data as any).groups : Array.isArray(data) ? data : [];
  const normalized = await Promise.all(
    rawGroups.map(async (group: any) => {
      const groupId = String(group.id);
      const members = Array.isArray(group?.members) && group.members.some((member: any) => typeof (member as any)?.id === "string")
        ? (group.members as Friend[])
        : await fetchGroupMembers(groupId);
      return { id: groupId, name: group.name || "Untitled group", members, color: group.color || "bg-blue-500" } as Group;
    })
  );
  groupsCache = normalized;
  return groupsCache;
}
export async function fetchGroupMembers(groupId: string): Promise<Friend[]> {
  if (groupMembersCache.has(groupId)) return groupMembersCache.get(groupId)!;
  try {
    const data = await apiClient(`/groups/${groupId}`);
    const group = (data as any)?.group ?? data;
    const list: any[] = Array.isArray(group?.members) ? (group.members as any[]) : [];
    const members = list.map((member) => mapMemberToFriend(member)).filter((m): m is Friend => Boolean(m));
    groupMembersCache.set(groupId, members);
    return members;
  } catch (error) {
    console.error("Failed to fetch group members for", groupId, error);
    groupMembersCache.set(groupId, []);
    return [];
  }
}
export async function fetchExternalAccounts(
  groupId: string,
): Promise<ExternalAccount[]> {
  if (externalAccountsCache.has(groupId)) return externalAccountsCache.get(groupId)!;
  const data = await apiClient(`/groups/${groupId}/accounts`);
  const accounts: ExternalAccount[] = Array.isArray((data as any)?.accounts)
    ? (data as any).accounts.map((a: any) => ({ ...a, createdDate: a.createdDate || a.createdAt }))
    : (Array.isArray(data) ? data : []);
  externalAccountsCache.set(groupId, accounts);
  return accounts;
}
