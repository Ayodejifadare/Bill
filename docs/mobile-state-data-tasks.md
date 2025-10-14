# State Management & Data Layer — Tasks and Status

- Port UserProfileProvider with AsyncStorage persistence [Done]
  - Path: `apps/mobile/state/UserProfileContext.tsx`
  - Persists `biltip-app-settings`; fetches `/users/me`; exposes update methods.

- Port LoadingStateContext [Done]
  - Path: `apps/mobile/state/LoadingStateContext.tsx`
  - Same API as web; no localStorage usage.

- RN apiClient with auth + mock support [Done]
  - Path: `apps/mobile/utils/apiClient.ts`
  - Reads Expo env (`EXPO_PUBLIC_*`), AsyncStorage-backed token and user id.
  - Dev auth via `x-user-id` if enabled.

- Config and auth storage [Done]
  - `apps/mobile/utils/config.ts` (Expo env)
  - `apps/mobile/utils/auth.ts` (save/load/clear auth + user)

- Hooks parity for networking [Done]
  - `apps/mobile/hooks/useUpcomingPayments.ts`
  - `apps/mobile/hooks/useTransactions.ts`

- Optional: React Query provider [Done]
  - `apps/mobile/state/QueryProvider.tsx` and wired in `apps/mobile/App.tsx`.

Next steps
- Decide whether to integrate providers into `RootNavigator` tree now (may trigger initial fetch during app mount) or attach them per-screen.
- Add offline caching policy with React Query (stale times, retry) and NetInfo awareness.
- Create storage migrations/versioning for persisted settings.

