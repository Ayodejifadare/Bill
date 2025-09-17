import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiClientMock, fetchFriendsApiMock } = vi.hoisted(() => ({
  apiClientMock: vi.fn(),
  fetchFriendsApiMock: vi.fn(),
}));

const loadSplitBillApi = async () => {
  vi.doMock('./apiClient', () => ({
    apiClient: apiClientMock,
  }));
  vi.doMock('../hooks/useFriends', () => ({
    fetchFriends: fetchFriendsApiMock,
  }));
  return import('./split-bill-api');
};

describe('split-bill-api utilities', () => {
  beforeEach(() => {
    vi.resetModules();
    apiClientMock.mockReset();
    fetchFriendsApiMock.mockReset();
  });

  it('delegates fetchFriends to useFriends implementation', async () => {
    const { fetchFriends } = await loadSplitBillApi();
    const friends = [
      { id: 'friend-1', name: 'Ada Lovelace', status: 'active' as const },
      { id: 'friend-2', name: 'Grace Hopper', status: 'active' as const },
    ];
    fetchFriendsApiMock.mockResolvedValueOnce(friends);

    const result = await fetchFriends();

    expect(fetchFriendsApiMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(friends);
  });

  it('fetchGroups caches results after the first request', async () => {
    const { fetchGroups } = await loadSplitBillApi();
    const groups = [
      { id: 'group-1', name: 'Weekend Trip', members: [], color: '#f97316' },
    ];
    apiClientMock.mockResolvedValueOnce({ groups });

    const firstResult = await fetchGroups();
    const secondResult = await fetchGroups();

    expect(apiClientMock).toHaveBeenCalledTimes(1);
    expect(apiClientMock).toHaveBeenNthCalledWith(1, '/groups');
    expect(firstResult).toEqual(groups);
    expect(secondResult).toBe(firstResult);
    expect(fetchFriendsApiMock).not.toHaveBeenCalled();
  });

  it('fetchExternalAccounts caches per group and normalizes createdDate', async () => {
    const { fetchExternalAccounts } = await loadSplitBillApi();
    const groupOneAccounts = [
      {
        id: 'acc-1',
        name: 'Checking',
        type: 'bank',
        isDefault: true,
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    const groupTwoAccounts = [
      {
        id: 'acc-2',
        name: 'Savings',
        type: 'mobile_money',
        isDefault: false,
        createdBy: 'user-2',
        createdDate: '2024-02-01T00:00:00Z',
      },
    ];
    apiClientMock.mockResolvedValueOnce({ accounts: groupOneAccounts });
    apiClientMock.mockResolvedValueOnce({ accounts: groupTwoAccounts });

    const firstGroupFirstFetch = await fetchExternalAccounts('group-1');
    const firstGroupSecondFetch = await fetchExternalAccounts('group-1');
    const secondGroupFirstFetch = await fetchExternalAccounts('group-2');
    const secondGroupSecondFetch = await fetchExternalAccounts('group-2');

    expect(apiClientMock).toHaveBeenCalledTimes(2);
    expect(apiClientMock).toHaveBeenNthCalledWith(1, '/groups/group-1/accounts');
    expect(apiClientMock).toHaveBeenNthCalledWith(2, '/groups/group-2/accounts');
    expect(firstGroupFirstFetch).toHaveLength(1);
    expect(firstGroupFirstFetch[0].createdDate).toBe('2024-01-01T00:00:00Z');
    expect(firstGroupSecondFetch).toBe(firstGroupFirstFetch);
    expect(secondGroupFirstFetch[0].createdDate).toBe('2024-02-01T00:00:00Z');
    expect(secondGroupSecondFetch).toBe(secondGroupFirstFetch);
  });

  it('clears caches when module state is reset', async () => {
    let { fetchGroups, fetchExternalAccounts } = await loadSplitBillApi();
    const initialGroups = [
      { id: 'group-1', name: 'Brunch Crew', members: [], color: '#3b82f6' },
    ];
    const initialAccounts = [
      {
        id: 'acc-1',
        name: 'Main Account',
        type: 'bank',
        isDefault: true,
        createdBy: 'user-1',
        createdDate: '2024-03-01T00:00:00Z',
      },
    ];
    apiClientMock.mockResolvedValueOnce({ groups: initialGroups });
    apiClientMock.mockResolvedValueOnce({ accounts: initialAccounts });

    const cachedGroups = await fetchGroups();
    const cachedAccounts = await fetchExternalAccounts('group-1');

    expect(cachedGroups).toEqual(initialGroups);
    expect(cachedAccounts).toEqual(initialAccounts);
    expect(apiClientMock).toHaveBeenCalledTimes(2);

    vi.resetModules();
    apiClientMock.mockReset();
    fetchFriendsApiMock.mockReset();

    ({ fetchGroups, fetchExternalAccounts } = await loadSplitBillApi());
    const refreshedGroups = [
      { id: 'group-2', name: 'Dinner Club', members: [], color: '#22c55e' },
    ];
    const refreshedAccounts = [
      {
        id: 'acc-2',
        name: 'Travel Wallet',
        type: 'mobile_money',
        isDefault: false,
        createdBy: 'user-2',
        createdDate: '2024-04-01T00:00:00Z',
      },
    ];
    apiClientMock.mockResolvedValueOnce({ groups: refreshedGroups });
    apiClientMock.mockResolvedValueOnce({ accounts: refreshedAccounts });

    const freshGroupResult = await fetchGroups();
    const freshAccountsResult = await fetchExternalAccounts('group-2');

    expect(apiClientMock).toHaveBeenCalledTimes(2);
    expect(freshGroupResult).toEqual(refreshedGroups);
    expect(freshAccountsResult).toEqual(refreshedAccounts);
  });
});
