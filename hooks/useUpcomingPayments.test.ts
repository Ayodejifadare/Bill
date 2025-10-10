import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from "../utils/apiClient";
import {
  useUpcomingPayments,
  type UpcomingPayment,
} from "./useUpcomingPayments";

const apiClientMock = apiClient as unknown as vi.Mock;

describe("useUpcomingPayments", () => {
  beforeEach(() => {
    apiClientMock.mockReset();
  });

  it("normalizes array responses from the api", async () => {
    const payments: UpcomingPayment[] = [
      {
        id: "1",
        type: "bill_split",
        title: "Dinner",
        amount: 42.5,
        dueDate: "2024-05-01",
        organizer: { name: "Alex", avatar: "avatar.png" },
        status: "pending",
        participants: 2,
        billSplitId: "split-1",
      },
    ];
    apiClientMock.mockResolvedValueOnce(payments);

    const { result } = renderHook(() => useUpcomingPayments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(apiClientMock).toHaveBeenCalledWith("/upcoming-payments");
    expect(result.current.error).toBeNull();
    expect(result.current.upcomingPayments).toEqual(payments);
  });

  it("normalizes objects containing the upcomingPayments property", async () => {
    const payments: UpcomingPayment[] = [
      {
        id: "2",
        type: "request",
        title: "Utilities",
        amount: 88,
        dueDate: "2024-05-15",
        organizer: { name: "Jamie", avatar: "avatar-2.png" },
        status: "due_soon",
        participants: ["user-1", "user-2"],
        requestId: "request-2",
      },
    ];
    apiClientMock.mockResolvedValueOnce({ upcomingPayments: payments });

    const { result } = renderHook(() => useUpcomingPayments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.upcomingPayments).toEqual(payments);
  });

  it("clears the list and exposes the fallback error message when the request fails", async () => {
    apiClientMock.mockRejectedValueOnce("network down");

    const { result } = renderHook(() => useUpcomingPayments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.upcomingPayments).toEqual([]);
    expect(result.current.error).toBe("Failed to fetch upcoming payments");
  });

  it("invokes the api client again when refetch is called", async () => {
    const initial: UpcomingPayment[] = [
      {
        id: "3",
        type: "bill_split",
        title: "Brunch",
        amount: 20,
        dueDate: "2024-06-01",
        organizer: { name: "Chris", avatar: "avatar-3.png" },
        status: "upcoming",
        participants: 3,
        billSplitId: "split-3",
      },
    ];
    const updated: UpcomingPayment[] = [
      {
        id: "4",
        type: "request",
        title: "Rent",
        amount: 1200,
        dueDate: "2024-06-05",
        organizer: { name: "Taylor", avatar: "avatar-4.png" },
        status: "pending",
        participants: ["user-a"],
        requestId: "request-4",
      },
    ];

    apiClientMock.mockResolvedValueOnce(initial);
    let resolveRefetch!: (value: UpcomingPayment[]) => void;
    const refetchResponse = new Promise<UpcomingPayment[]>((resolve) => {
      resolveRefetch = resolve;
    });
    apiClientMock.mockImplementationOnce(() => refetchResponse);

    const { result } = renderHook(() => useUpcomingPayments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.upcomingPayments).toEqual(initial);

    const refetchPromise = result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    resolveRefetch(updated);

    await act(async () => {
      await refetchPromise;
    });

    expect(apiClientMock).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.upcomingPayments).toEqual(updated);
  });
});
