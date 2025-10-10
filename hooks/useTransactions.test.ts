import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from "../utils/apiClient";
import { useTransactions, Transaction } from "./useTransactions";

const apiClientMock = vi.mocked(apiClient);

describe("useTransactions", () => {
  beforeEach(() => {
    apiClientMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses cursor-based pagination when cursor is provided", async () => {
    const transaction: Transaction = {
      id: "1",
      type: "sent",
      amount: 125.5,
      description: "Lunch split",
      date: "2024-01-01",
      status: "completed",
    };

    const transactionsResponse = {
      transactions: [transaction],
      hasMore: true,
      nextCursor: "cursor-2",
      total: 42,
      pageCount: 4,
    };

    const summaryResponse = {
      totalSent: 200,
      totalReceived: 150,
      netFlow: 50,
    };

    const capturedQueries: string[] = [];

    apiClientMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/transactions?")) {
        capturedQueries.push(url.slice(url.indexOf("?") + 1));
        return transactionsResponse;
      }
      if (url.startsWith("/api/transactions/summary")) {
        return summaryResponse;
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    const { result } = renderHook(() =>
      useTransactions({ cursor: "cursor-1", limit: 30 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(capturedQueries).toHaveLength(1);
    const params = new URLSearchParams(capturedQueries[0]);
    expect(params.get("cursor")).toBe("cursor-1");
    expect(params.get("limit")).toBe("30");
    expect(params.get("page")).toBeNull();
    expect(params.get("size")).toBeNull();

    expect(result.current.transactions).toEqual(
      transactionsResponse.transactions,
    );
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBe("cursor-2");
    expect(result.current.total).toBe(42);
    expect(result.current.pageCount).toBe(4);
    expect(result.current.summary).toEqual(summaryResponse);
    expect(result.current.error).toBeNull();
  });

  it("uses page and size parameters when cursor is not provided", async () => {
    const transaction: Transaction = {
      id: "99",
      type: "received",
      amount: 80,
      description: "Refund",
      date: "2024-01-02",
      status: "pending",
    };

    const transactionsResponse = {
      transactions: [transaction],
      hasMore: false,
      nextCursor: null,
      total: 10,
      pageCount: 1,
    };

    const summaryResponse = {
      totalSent: 0,
      totalReceived: 80,
      netFlow: 80,
    };

    let capturedQuery = "";

    apiClientMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/transactions?")) {
        capturedQuery = url.slice(url.indexOf("?") + 1);
        return transactionsResponse;
      }
      if (url.startsWith("/api/transactions/summary")) {
        return summaryResponse;
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    const { result } = renderHook(() => useTransactions({ page: 2, size: 15 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const params = new URLSearchParams(capturedQuery);
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("15");
    expect(params.has("cursor")).toBe(false);
    expect(params.has("limit")).toBe(false);

    expect(result.current.transactions).toEqual(
      transactionsResponse.transactions,
    );
    expect(result.current.hasMore).toBe(false);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.total).toBe(10);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.summary).toEqual(summaryResponse);
    expect(result.current.error).toBeNull();
  });

  it("resets state and exposes the error when the request fails", async () => {
    const failure = new Error("Network down");

    apiClientMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/transactions?")) {
        throw failure;
      }
      if (url.startsWith("/api/transactions/summary")) {
        return { totalSent: 999, totalReceived: 999, netFlow: 0 };
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    const { result } = renderHook(() => useTransactions({ page: 1, size: 5 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.transactions).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.total).toBe(0);
    expect(result.current.pageCount).toBe(0);
    expect(result.current.summary).toEqual({
      totalSent: 0,
      totalReceived: 0,
      netFlow: 0,
    });
    expect(result.current.error).toBe("Network down");
  });
});
