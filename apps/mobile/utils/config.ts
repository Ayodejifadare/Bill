const bool = (v: any) => String(v).toLowerCase() === 'true';

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '/api';
export const useMockApi = bool(process.env.EXPO_PUBLIC_USE_MOCK_API);
export const useDevAuth = bool(process.env.EXPO_PUBLIC_USE_DEV_AUTH);
export const devUserId = process.env.EXPO_PUBLIC_DEV_USER_ID || '';

