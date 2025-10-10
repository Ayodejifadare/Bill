import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from "../utils/apiClient";
import { useBillSplits } from "./useBillSplits";

const apiClientMock = vi.mocked(apiClient);

describe("useBillSplits", () => {
  beforeEach(() => {
    apiClientMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests bill splits with the expected search parameters", async () => {
    apiClientMock.mockResolvedValue({ billSplits: [], total: 0, pageCount: 0 });

    const { result } = renderHook(() =>
      useBillSplits({
        groupId: "group-123",
        category: "food",
        minAmount: 10,
        maxAmount: 250,
        keyword: "pizza",
        page: 3,
        size: 5,
      }),
    );

    await waitFor(() => expect(apiClientMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const endpoint = apiClientMock.mock.calls[0][0] as string;
    const url = new URL(endpoint, "https://example.com");

    expect(url.pathname).toBe("/bill-splits");
    expect(url.searchParams.get("groupId")).toBe("group-123");
    expect(url.searchParams.get("category")).toBe("food");
    expect(url.searchParams.get("minAmount")).toBe("10");
    expect(url.searchParams.get("maxAmount")).toBe("250");
    expect(url.searchParams.get("keyword")).toBe("pizza");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("size")).toBe("5");
    expect(result.current.error).toBeNull();
  });

  it("normalizes participant data from various response shapes", async () => {
    apiClientMock.mockResolvedValue({
      billSplits: [
        {
          id: 1,
          title: "Weekend Trip",
          totalAmount: "120.75",
          yourShare: "40.25",
          status: "completed",
          participants: [
            { name: "Alice", amount: 60.5, paid: true },
            { user: { name: "Bob" }, amount: "30.25", isPaid: 1 },
            { name: null, amount: undefined, paid: "no" },
          ],
          createdBy: { name: "Planner" },
          createdAt: "2023-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      pageCount: 1,
    });

    const { result } = renderHook(() => useBillSplits());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.billSplits).toHaveLength(1);
    expect(result.current.billSplits[0].participants).toEqual([
      { name: "Alice", amount: 60.5, paid: true },
      { name: "Bob", amount: 30.25, paid: true },
      { name: "Unknown", amount: 0, paid: false },
    ]);
    expect(result.current.total).toBe(1);
    expect(result.current.pageCount).toBe(1);
  });

  it("resets state and surfaces a fallback message when a request fails", async () => {
    apiClientMock.mockResolvedValueOnce({
      billSplits: [
        {
          id: "initial",
          title: "Initial Split",
          totalAmount: 42,
          yourShare: 21,
          status: "pending",
          participants: [],
          createdBy: "User",
          date: "2023-01-02T00:00:00.000Z",
        },
      ],
      total: 5,
      pageCount: 2,
    });

    const { result } = renderHook(() => useBillSplits());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.billSplits).toHaveLength(1);
    expect(result.current.total).toBe(5);
    expect(result.current.pageCount).toBe(2);

    apiClientMock.mockRejectedValueOnce("network-down");

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(apiClientMock).toHaveBeenCalledTimes(2);
    expect(result.current.billSplits).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pageCount).toBe(0);
    expect(result.current.error).toBe("Failed to fetch bill splits");
  });

  it("allows refetch to override initial options", async () => {
    apiClientMock
      .mockResolvedValueOnce({ billSplits: [], total: 1, pageCount: 1 })
      .mockResolvedValueOnce({ billSplits: [], total: 7, pageCount: 3 });

    const { result } = renderHook(() =>
      useBillSplits({ keyword: "initial", page: 2, size: 10 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiClientMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch({ page: 4, keyword: "updated" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(apiClientMock).toHaveBeenCalledTimes(2);
    const endpoint = apiClientMock.mock.calls[1][0] as string;
    const url = new URL(endpoint, "https://example.com");

    expect(url.searchParams.get("page")).toBe("4");
    expect(url.searchParams.get("keyword")).toBe("updated");
    expect(url.searchParams.get("size")).toBe("10");
    expect(result.current.total).toBe(7);
    expect(result.current.pageCount).toBe(3);
  });
});
