// Typed API utilities for SplitBill component with simple in-memory caching
// to avoid repeated network calls when navigating between screens.
//
// These helpers originally returned mocked data with simulated latency. They
// now call the real API endpoints while preserving the same caching behaviour
// so navigation between screens doesn't trigger redundant network requests.

import { fetchFriends as fetchFriendsApi, Friend } from '../hooks/useFriends';
import { apiClient } from './apiClient';

export interface Group {
  id: string;
  name: string;
  members: Friend[];
  color: string;
}

export interface ExternalAccount {
  id: string;
  name: string;
  type: 'bank' | 'mobile_money';
  // Bank fields
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  sortCode?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  // Metadata
  isDefault: boolean;
  createdBy: string;
  createdDate: string;
}

// Simple caches to prevent duplicate network calls
let groupsCache: Group[] | null = null;
const groupMembersCache = new Map<string, Friend[]>();

const mapGroupMemberToFriend = (member: any): Friend | null => {
  if (!member) return null;
  const user = member.user ?? member;
  const id = user?.id ?? member?.userId ?? member?.id;
  if (!id) return null;
  const name = user?.name ?? member?.name ?? 'Unnamed member';
  return {
    id: String(id),
    name,
    avatar: user?.avatar ?? member?.avatar ?? undefined,
    phoneNumber: user?.phone ?? user?.phoneNumber ?? member?.phone ?? member?.phoneNumber ?? undefined,
    status: 'active',
  };
};
const externalAccountsCache = new Map<string, ExternalAccount[]>();

export type { Friend } from '../hooks/useFriends';

export async function fetchFriends(): Promise<Friend[]> {
  return fetchFriendsApi();
}

export async function fetchGroups(): Promise<Group[]> {
  if (groupsCache) return groupsCache;

  const data = await apiClient('/groups');
  const rawGroups = Array.isArray((data as any)?.groups)
    ? (data as any).groups
    : Array.isArray(data)
      ? data
      : [];

  const normalized = await Promise.all(
    rawGroups.map(async (group: any) => {
      const groupId = String(group.id);
      const members =
        Array.isArray(group?.members) &&
        group.members.some((member: any) => typeof (member as any)?.id === 'string')
          ? (group.members as Friend[])
          : await fetchGroupMembers(groupId);

      return {
        id: groupId,
        name: group.name || 'Untitled group',
        members,
        color: group.color || 'bg-blue-500',
      } as Group;
    })
  );

  groupsCache = normalized;
  return groupsCache;
}

export async function fetchGroupMembers(groupId: string): Promise<Friend[]> {
  if (groupMembersCache.has(groupId)) {
    return groupMembersCache.get(groupId)!;
  }

  try {
    const data = await apiClient(`/groups/${groupId}`);
    const group = (data as any)?.group ?? data;
    const members = Array.isArray(group?.members)
      ? (group.members as any[])
          .map((member) => mapMemberToFriend(member))
          .filter((member): member is Friend => Boolean(member))
      : [];
    groupMembersCache.set(groupId, members);
    return members;
  } catch (error) {
    console.error('Failed to fetch group members for', groupId, error);
    groupMembersCache.set(groupId, []);
    return [];
  }
}
export async function fetchExternalAccounts(
  groupId: string
): Promise<ExternalAccount[]> {
  if (externalAccountsCache.has(groupId)) {
    return externalAccountsCache.get(groupId)!;
  }

  const data = await apiClient(`/groups/${groupId}/accounts`);
  const accounts: ExternalAccount[] = Array.isArray(data.accounts)
    ? data.accounts.map((a: any) => ({
        ...a,
        createdDate: a.createdDate || a.createdAt,
      }))
    : data;
  externalAccountsCache.set(groupId, accounts);
  return accounts;
}
