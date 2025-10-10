import { apiClient } from "./apiClient";

export async function apiClientWithRetry<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await apiClient(input, init);
  } catch (err) {
    if (retries <= 1) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClientWithRetry<T>(input, init, retries - 1, delay * 2);
  }
}
