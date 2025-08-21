// Typed API utilities for SplitBill component with simple in-memory caching
// to avoid repeated network calls when navigating between screens. These
// functions currently return mocked data but simulate asynchronous API calls
// and expose strong typing for consumers.

import { fetchFriends as fetchFriendsApi, Friend } from '../hooks/useFriends';

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

// Simulated latency helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchFriends(_isNigeria: boolean): Promise<Friend[]> {
  return fetchFriendsApi();
}

export async function fetchGroups(isNigeria: boolean): Promise<Group[]> {
  if (groupsCache) return groupsCache;
  const friends = await fetchFriends(isNigeria);
  await delay(100);
  groupsCache = [
    {
      id: '1',
      name: 'Work Team',
      members: friends.slice(0, 3),
      color: 'bg-blue-500',
    },
    {
      id: '2',
      name: 'College Friends',
      members: friends.slice(1, 4),
      color: 'bg-green-500',
    },
    {
      id: '3',
      name: 'Roommates',
      members: friends.slice(2, 5),
      color: 'bg-purple-500',
    },
  ];
  return groupsCache;
}

export async function fetchExternalAccounts(
  groupId: string
): Promise<ExternalAccount[]> {
  if (externalAccountsCache.has(groupId)) {
    return externalAccountsCache.get(groupId)!;
  }
  await delay(100);
  const data: Record<string, ExternalAccount[]> = {
    '1': [
      {
        id: '1',
        name: 'Team Lunch Account',
        type: 'bank',
        bankName: 'Chase Bank',
        accountNumber: '1234567890',
        accountHolderName: 'Emily Davis',
        routingNumber: '021000021',
        accountType: 'checking',
        isDefault: true,
        createdBy: 'Emily Davis',
        createdDate: '2025-01-10T10:00:00Z',
      },
      {
        id: '2',
        name: 'Office Supplies Fund',
        type: 'mobile_money',
        provider: 'Zelle',
        phoneNumber: '+1 (555) 123-4567',
        isDefault: false,
        createdBy: 'John Doe',
        createdDate: '2025-01-05T15:30:00Z',
      },
    ],
    '2': [
      {
        id: '1',
        name: 'Utilities & Rent',
        type: 'bank',
        bankName: 'Bank of America',
        accountNumber: '9876543210',
        accountHolderName: 'Alex Rodriguez',
        routingNumber: '026009593',
        accountType: 'checking',
        isDefault: true,
        createdBy: 'Alex Rodriguez',
        createdDate: '2024-12-01T10:00:00Z',
      },
    ],
    '3': [
      {
        id: '1',
        name: 'Travel Expenses',
        type: 'bank',
        bankName: 'Wells Fargo',
        accountNumber: '5432109876',
        accountHolderName: 'Sarah Johnson',
        routingNumber: '121000248',
        accountType: 'savings',
        isDefault: true,
        createdBy: 'Sarah Johnson',
        createdDate: '2024-03-15T14:20:00Z',
      },
    ],
  };
  const accounts = data[groupId] || [];
  externalAccountsCache.set(groupId, accounts);
  return accounts;
}
