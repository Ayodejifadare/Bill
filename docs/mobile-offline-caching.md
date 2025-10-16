**Overview**
- Enables React Query persistence to `AsyncStorage` with mobile-tuned retry/backoff.
- Integrates NetInfo so queries pause when offline and resume on reconnect.

**Where**
- Provider: `apps/mobile/state/QueryProvider.tsx:1`
- Online manager: `apps/mobile/state/useOnlineManager.ts:1`
- Banner: `apps/mobile/components/NetworkBanner.tsx:1` (visual only)

**Persistence**
- Uses `@tanstack/react-query-persist-client` with `@tanstack/query-async-storage-persister`.
- Persist key: `RQ_CACHE_V1`.
- `maxAge`: 24h; `staleTime`: 5m; `gcTime`: 24h.
- On app relaunch, the cache hydrates automatically; fresh data does not refetch immediately.

**Retry/Backoff**
- Retries: 3 attempts.
- Delay: exponential with jitter, capped at 30s.

**Offline Behavior**
- `useOnlineManager` wires React Query’s `onlineManager` to NetInfo.
- Queries do not start while offline; they resume automatically when connectivity returns.
- `NetworkBanner` shows a discreet offline notice in UI.

**Testing**
- Offline pause/resume: `apps/mobile/__tests__/reactQuery.offline.test.tsx:1`
- Cache hydration on relaunch: `apps/mobile/__tests__/reactQuery.persistence.test.tsx:1`
- Tests mock NetInfo and AsyncStorage (via existing jest setup).

**Notes**
- Bump the `buster` in `QueryProvider` to invalidate old persisted caches when making breaking data changes.
- Consider adjusting `staleTime` per-screen via `useQuery` options for critical freshness.

