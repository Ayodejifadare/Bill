import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { saveAuth, loadAuth, clearAuth } from "./auth";

const AUTH_KEY = "biltip_auth";
const USER_KEY = "biltip_user";

const originalWindow =
  typeof globalThis.window !== "undefined" ? globalThis.window : undefined;
const originalLocalStorage =
  typeof globalThis.localStorage !== "undefined"
    ? globalThis.localStorage
    : undefined;
const originalLocalStorageDescriptor =
  typeof originalWindow !== "undefined"
    ? Object.getOwnPropertyDescriptor(originalWindow, "localStorage")
    : undefined;

describe("auth storage helpers", () => {
  let store: Record<string, string>;
  let getItemMock: ReturnType<typeof vi.fn>;
  let setItemMock: ReturnType<typeof vi.fn>;
  let removeItemMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = {};

    getItemMock = vi.fn((key: string) => (key in store ? store[key] : null));
    setItemMock = vi.fn((key: string, value: string) => {
      store[key] = value;
    });
    removeItemMock = vi.fn((key: string) => {
      delete store[key];
    });

    const localStorageMock = {
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: removeItemMock,
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length;
      },
    } as unknown as Storage;

    if (typeof globalThis.window === "undefined") {
      (globalThis as any).window = {};
    }

    Object.defineProperty(globalThis.window as Window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });

    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    if (
      typeof globalThis.window === "undefined" &&
      typeof originalWindow !== "undefined"
    ) {
      (globalThis as any).window = originalWindow;
    }

    if (typeof globalThis.window !== "undefined") {
      if (originalLocalStorageDescriptor) {
        Object.defineProperty(
          globalThis.window as Window,
          "localStorage",
          originalLocalStorageDescriptor,
        );
      } else {
        delete (globalThis.window as unknown as Record<string, unknown>)
          .localStorage;
      }
    }

    if (typeof originalLocalStorage !== "undefined") {
      (globalThis as any).localStorage = originalLocalStorage;
    } else {
      delete (globalThis as unknown as Record<string, unknown>).localStorage;
    }
  });

  it("saveAuth stores auth and user data", () => {
    const authData = { token: "abc", expiresAt: Date.now() };
    const userData = { name: "Test User" };

    saveAuth({ auth: authData, user: userData });

    expect(setItemMock).toHaveBeenNthCalledWith(
      1,
      AUTH_KEY,
      JSON.stringify(authData),
    );
    expect(setItemMock).toHaveBeenNthCalledWith(
      2,
      USER_KEY,
      JSON.stringify(userData),
    );
    expect(store[AUTH_KEY]).toBe(JSON.stringify(authData));
    expect(store[USER_KEY]).toBe(JSON.stringify(userData));
  });

  it("loadAuth returns parsed objects when both entries exist", () => {
    const authData = { token: "def", expiresAt: Date.now() + 1000 };
    const userData = { name: "Another User" };

    store[AUTH_KEY] = JSON.stringify(authData);
    store[USER_KEY] = JSON.stringify(userData);

    const result = loadAuth();

    expect(result).toEqual({ auth: authData, user: userData });
    expect(getItemMock).toHaveBeenCalledWith(AUTH_KEY);
    expect(getItemMock).toHaveBeenCalledWith(USER_KEY);
  });

  it("loadAuth returns null when either entry is missing", () => {
    store[AUTH_KEY] = JSON.stringify({ token: "xyz" });

    const result = loadAuth();

    expect(result).toBeNull();
    expect(getItemMock).toHaveBeenCalledWith(AUTH_KEY);
    expect(getItemMock).toHaveBeenCalledWith(USER_KEY);
  });

  it("loadAuth returns null when stored data cannot be parsed", () => {
    store[AUTH_KEY] = "{invalid-json";
    store[USER_KEY] = JSON.stringify({ name: "Broken" });

    const result = loadAuth();

    expect(result).toBeNull();
    expect(getItemMock).toHaveBeenCalledWith(AUTH_KEY);
    expect(getItemMock).toHaveBeenCalledWith(USER_KEY);
  });

  it("clearAuth removes both stored entries", () => {
    store[AUTH_KEY] = JSON.stringify({ token: "aaa" });
    store[USER_KEY] = JSON.stringify({ name: "bbb" });

    clearAuth();

    expect(removeItemMock).toHaveBeenNthCalledWith(1, AUTH_KEY);
    expect(removeItemMock).toHaveBeenNthCalledWith(2, USER_KEY);
    expect(store[AUTH_KEY]).toBeUndefined();
    expect(store[USER_KEY]).toBeUndefined();
  });

  it("auth helpers no-op when window is undefined", () => {
    const authData = { token: "noop-token" };
    const userData = { name: "No Window" };
    const currentWindow = globalThis.window;

    try {
      // @ts-expect-error - delete to simulate non-browser environment
      delete globalThis.window;

      saveAuth({ auth: authData, user: userData });
      expect(setItemMock).not.toHaveBeenCalled();

      expect(loadAuth()).toBeNull();
      expect(getItemMock).not.toHaveBeenCalled();

      clearAuth();
      expect(removeItemMock).not.toHaveBeenCalled();
    } finally {
      if (typeof currentWindow !== "undefined") {
        (globalThis as any).window = currentWindow;
      }
    }
  });
});
