import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Friend } from './useFriends';
import { fetchFriends, invalidateFriendsCache, useFriends } from './useFriends';
import { apiClient } from '../utils/apiClient';

vi.mock('../utils/apiClient', () => ({
  apiClient: vi.fn(),
}));

type ApiClientMock = ReturnType<typeof vi.fn>;
let apiClientMock: ApiClientMock;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  apiClientMock = apiClient as unknown as ApiClientMock;
  apiClientMock.mockReset();
  invalidateFriendsCache();
});

describe('fetchFriends', () => {
  it('reuses inflight promise and filters inactive statuses', async () => {
    const response = {
      friends: [
        { id: '1', name: 'Active Alice', status: 'active' },
        { id: '2', name: 'Pending Pam', status: 'pending' },
        { id: '3', name: 'Blocked Ben', status: 'blocked' },
      ],
    };

    const deferred = createDeferred<typeof response>();
    apiClientMock.mockReturnValueOnce(deferred.promise);

    const firstCall = fetchFriends();
    const secondCall = fetchFriends();

    deferred.resolve(response);
    const [friends, sameFriends] = await Promise.all([firstCall, secondCall]);

    const expected: Friend[] = [
      { id: '1', name: 'Active Alice', avatar: undefined, phoneNumber: undefined, status: 'active' },
    ];

    expect(friends).toEqual(expected);
    expect(sameFriends).toBe(friends);
    expect(apiClientMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache and dispatches update event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    apiClientMock.mockResolvedValueOnce({
      friends: [
        { id: '1', name: 'Cached Casey', status: 'active' },
      ],
    });

    const cached = await fetchFriends();
    expect(cached).toHaveLength(1);

    apiClientMock.mockClear();

    const reused = await fetchFriends();
    expect(reused).toEqual(cached);
    expect(apiClientMock).not.toHaveBeenCalled();

    apiClientMock.mockResolvedValueOnce({
      friends: [
        { id: '2', name: 'Fresh Frankie', status: 'active' },
      ],
    });

    invalidateFriendsCache();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'friendsUpdated' }));

    const refreshed = await fetchFriends();

    const expected: Friend[] = [
      { id: '2', name: 'Fresh Frankie', avatar: undefined, phoneNumber: undefined, status: 'active' },
    ];

    expect(refreshed).toEqual(expected);
    expect(apiClientMock).toHaveBeenCalledTimes(1);

    dispatchSpy.mockRestore();
  });
});

describe('useFriends', () => {
  it('returns cached data immediately', async () => {
    apiClientMock.mockResolvedValueOnce({
      friends: [
        { id: '1', name: 'Cached Carly', status: 'active' },
      ],
    });

    const cached = await fetchFriends();

    apiClientMock.mockClear();

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual(cached);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(apiClientMock).not.toHaveBeenCalled();
  });

  it('fetches friends when cache is empty', async () => {
    apiClientMock.mockResolvedValueOnce({
      friends: [
        { id: '1', name: 'Fetched Fiona', status: 'active' },
      ],
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    const expected: Friend[] = [
      { id: '1', name: 'Fetched Fiona', avatar: undefined, phoneNumber: undefined, status: 'active' },
    ];

    expect(result.current.friends).toEqual(expected);
    expect(result.current.error).toBeNull();
    expect(apiClientMock).toHaveBeenCalledTimes(1);
  });

  it('captures error messages when fetch rejects', async () => {
    const error = new Error('network failure');
    apiClientMock.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useFriends());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network failure');
    expect(result.current.friends).toEqual([]);
  });
});
