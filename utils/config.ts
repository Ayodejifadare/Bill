export const useMockApi = String(import.meta.env.VITE_USE_MOCK_API).toLowerCase() === 'true';
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
