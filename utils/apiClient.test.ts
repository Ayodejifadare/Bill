import { describe, beforeEach, it, expect, vi } from "vitest";

let mockUseMockApi = false;
let mockUseDevAuth = false;
let mockDevUserId = "";
vi.mock("./config", () => ({
  apiBaseUrl: "http://example.com",
  get useMockApi() {
    return mockUseMockApi;
  },
  get useDevAuth() {
    return mockUseDevAuth;
  },
  get devUserId() {
    return mockDevUserId;
  },
}));

import { apiClient } from "./apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    mockUseMockApi = false;
    mockUseDevAuth = false;
    mockDevUserId = "";
    const store: Record<string, string> = {};
    // simple in-memory localStorage mock
    globalThis.localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as unknown as Storage;

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    ) as unknown as typeof fetch;

    // ensure tests start from a non-development environment unless overridden
    process.env.NODE_ENV = "test";
  });

  it("appends Authorization header when token is a valid JWT", async () => {
    const token = "aaa.bbb.ccc";
    localStorage.setItem("biltip_auth", JSON.stringify({ token }));

    await apiClient("/test");

    expect(fetch).toHaveBeenCalledWith(
      "http://example.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
  });

  it("appends Authorization header for any token when using mock API", async () => {
    mockUseMockApi = true;
    const token = "mock-token";
    localStorage.setItem("biltip_auth", JSON.stringify({ token }));

    await apiClient("/test");

    expect(fetch).toHaveBeenCalledWith(
      "http://example.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
  });

  it("appends Authorization header for any token in development mode", async () => {
    const token = "mock-token";
    localStorage.setItem("biltip_auth", JSON.stringify({ token }));
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    await apiClient("/test");

    expect(fetch).toHaveBeenCalledWith(
      "http://example.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );

    process.env.NODE_ENV = prev;
  });

  it("includes Authorization header for profile requests and returns user data", async () => {
    const token = "mock-token";
    localStorage.setItem("biltip_auth", JSON.stringify({ token }));
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: { id: "123", name: "Tester" } }),
    });

    const result = await apiClient("/users/123");

    expect(fetch).toHaveBeenCalledWith(
      "http://example.com/users/123",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
    expect(result).toEqual({ user: { id: "123", name: "Tester" } });

    process.env.NODE_ENV = prev;
  });

  it("returns mock profile data when using mock API", async () => {
    mockUseMockApi = true;

    const result = await apiClient("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: "+123", otp: "000000" }),
    });

    expect(result).toMatchObject({
      token: "mock-token",
      user: {
        id: "demo-user",
        name: "Demo User",
        phone: "+123",
      },
    });
  });

  describe("dev auth x-user-id header", () => {
    it.each([
      {
        label: "env devUserId",
        envId: "env-123",
        storedUser: null,
        expected: "env-123",
      },
      {
        label: "localStorage user id",
        envId: "",
        storedUser: { id: "local-456" },
        expected: "local-456",
      },
    ])(
      "appends x-user-id header when %s is used",
      async ({ envId, storedUser, expected }) => {
        mockUseDevAuth = true;
        const prevDevUserId = mockDevUserId;
        try {
          mockDevUserId = envId;
          if (storedUser) {
            localStorage.setItem("biltip_user", JSON.stringify(storedUser));
          }

          await apiClient("/test");

          expect(fetch).toHaveBeenCalledWith(
            "http://example.com/test",
            expect.objectContaining({
              headers: expect.objectContaining({ "x-user-id": expected }),
            }),
          );

          const [, options] = (fetch as any).mock.calls[0];
          expect(options.headers.Authorization).toBeUndefined();
        } finally {
          mockDevUserId = prevDevUserId;
        }
      },
    );
  });

  it("clears stored auth and dispatches session-expired for invalid tokens", async () => {
    const token = "invalid";
    localStorage.setItem("biltip_auth", JSON.stringify({ token }));
    localStorage.setItem("biltip_user", JSON.stringify({ name: "Tester" }));
    const listener = vi.fn();
    window.addEventListener("session-expired", listener);

    await apiClient("/test");

    expect(localStorage.getItem("biltip_auth")).toBeNull();
    expect(localStorage.getItem("biltip_user")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    const [, options] = (fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();

    window.removeEventListener("session-expired", listener);
  });
});
