import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupDetailsScreen } from "./GroupDetailsScreen";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GroupDetailsScreen", () => {
  it("renders transactions and supports pagination", async () => {
    const group = {
      id: "1",
      name: "Test Group",
      description: "",
      totalSpent: 0,
      totalMembers: 1,
      isAdmin: false,
      createdDate: "",
      color: "",
      members: [],
      recentTransactions: [
        {
          id: "t1",
          type: "bill_split",
          amount: 10,
          description: "First",
          date: "2025-01-01T00:00:00Z",
          status: "completed",
          paidBy: "A",
          participants: [],
        },
      ],
      hasMoreTransactions: true,
    };

    const more = [
      {
        id: "t2",
        type: "bill_split",
        amount: 20,
        description: "Second",
        date: "2025-01-02T00:00:00Z",
        status: "completed",
        paidBy: "B",
        participants: [],
      },
    ];

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: more }),
      } as unknown as Response);

    render(<GroupDetailsScreen groupId="1" onNavigate={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getAllByText("Test Group").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("First")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Load more"));

    await waitFor(() => expect(screen.getByText("Second")).toBeInTheDocument());
  });
});
