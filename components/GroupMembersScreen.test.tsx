import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { GroupMembersScreen } from "./GroupMembersScreen";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const members = [
  {
    id: "m1",
    name: "John Doe",
    username: "@john",
    role: "member",
    joinedAt: "2024-01-01",
    lastActive: "now",
    totalSpent: 0,
    totalOwed: 0,
    isYou: true,
    status: "active",
    permissions: {
      canAddMembers: true,
      canRemoveMembers: true,
      canCreateSplits: true,
      canEditGroup: false,
    },
  },
  {
    id: "m2",
    name: "Alice Smith",
    username: "@alice",
    role: "member",
    joinedAt: "2024-01-01",
    lastActive: "now",
    totalSpent: 0,
    totalOwed: 0,
    isYou: false,
    status: "active",
    permissions: {
      canAddMembers: false,
      canRemoveMembers: false,
      canCreateSplits: true,
      canEditGroup: false,
    },
  },
];

const invites: any[] = [];

describe("GroupMembersScreen", () => {
  it("filters members by search", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url: any) => {
      if (url.endsWith("/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ members }),
        } as Response);
      }
      if (url.endsWith("/invites")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invites }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });

    render(<GroupMembersScreen groupId="g1" onNavigate={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/John Doe/)).toBeInTheDocument(),
    );

    const [search] = screen.getAllByPlaceholderText("Search members...");
    fireEvent.change(search, {
      target: { value: "Alice" },
    });

    await waitFor(() =>
      expect(screen.getByText("Alice Smith")).toBeInTheDocument(),
    );
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("removes a member", async () => {
    const fetchMock = vi.fn((url: any, options?: any) => {
      if (url === "/api/groups/g1/members") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ members }),
        } as Response);
      }
      if (url === "/api/groups/g1/invites") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invites }),
        } as Response);
      }
      if (url === "/api/groups/g1/members/m2" && options?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }
      return Promise.reject(new Error("unknown url"));
    });

    vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);

    render(<GroupMembersScreen groupId="g1" onNavigate={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/John Doe/)).toBeInTheDocument(),
    );

    const [search2] = screen.getAllByPlaceholderText("Search members...");
    fireEvent.change(search2, {
      target: { value: "Alice" },
    });
    await waitFor(() =>
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0),
    );
    const user = userEvent.setup();
    await user.click(screen.getAllByLabelText("Member actions")[0]);
    const removeItem = await screen.findByText("Remove from Group");
    await user.click(removeItem);

    await waitFor(() => expect(screen.queryByText("Alice Smith")).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/groups/g1/members/m2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
