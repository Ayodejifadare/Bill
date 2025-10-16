const bool = (v: any) => String(v).toLowerCase() === 'true';

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '/api';
// Default to mock API when the flag is unset (helps local/mobile dev and Expo Go)
const MOCK_FLAG = process.env.EXPO_PUBLIC_USE_MOCK_API;
export const useMockApi = MOCK_FLAG === undefined ? true : bool(MOCK_FLAG);
const DEV_FLAG = process.env.EXPO_PUBLIC_USE_DEV_AUTH;
export const useDevAuth = DEV_FLAG === undefined ? true : bool(DEV_FLAG);
export const devUserId = process.env.EXPO_PUBLIC_DEV_USER_ID || '';
