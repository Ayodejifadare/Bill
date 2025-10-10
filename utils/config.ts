export const useMockApi =
  String(import.meta.env.VITE_USE_MOCK_API).toLowerCase() === "true";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

// Dev auth helpers: when enabled, client sends `x-user-id` to bypass JWT.
export const useDevAuth =
  String(import.meta.env.VITE_USE_DEV_AUTH).toLowerCase() === "true";
export const devUserId =
  (import.meta.env.VITE_DEV_USER_ID as string | undefined) || "";
