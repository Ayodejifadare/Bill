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
const externalAccountsCache = new Map<string, ExternalAccount[]>();

export async function fetchFriends(_isNigeria: boolean): Promise<Friend[]> {
  return fetchFriendsApi();
}

export async function fetchGroups(_isNigeria: boolean): Promise<Group[]> {
  if (groupsCache) return groupsCache;

  const data = await apiClient('/groups');
  groupsCache = Array.isArray(data.groups) ? data.groups : data;
  return groupsCache;
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
