import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemberInviteScreen } from "./MemberInviteScreen";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  (global.fetch as any)?.mockClear?.();
  cleanup();
});

describe("MemberInviteScreen", () => {
  it("creates invite link", async () => {
    const newLink = {
      id: "l1",
      link: "https://test.com/invite/abc",
      createdAt: "2024-01-15T12:00:00Z",
      expiresAt: "2024-01-22T12:00:00Z",
      maxUses: 10,
      currentUses: 0,
      createdBy: "You",
      isActive: true,
    };

    const fetchMock = vi.fn((url: string, options?: any) => {
      if (url === "/api/groups/g1/invites") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invites: [] }),
        } as Response);
      }
      if (
        url === "/api/groups/g1/invite-links" &&
        (!options || options.method === undefined)
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ links: [] }),
        } as Response);
      }
      if (url === "/api/groups/g1/invite-links" && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ link: newLink }),
        } as Response);
      }
      return Promise.reject(new Error("unknown url"));
    });
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);

    render(<MemberInviteScreen groupId="g1" onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByText("Links"));
    fireEvent.click(screen.getByText("Create Link"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/groups/g1/invite-links",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("Invite Link")).toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("resends invite", async () => {
    const invite = {
      id: "i1",
      name: "Alice",
      contact: "alice@example.com",
      method: "email" as const,
      invitedBy: "You",
      invitedAt: "2024-01-15T00:00:00Z",
      status: "sent" as const,
      expiresAt: "2099-01-22T00:00:00Z",
      attempts: 1,
    };
    const updatedInvite = {
      ...invite,
      attempts: 2,
      status: "delivered" as const,
      lastAttempt: "2024-01-16T00:00:00Z",
    };

    const fetchMock = vi.fn((url: string, options?: any) => {
      if (url === "/api/groups/g1/invites") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invites: [invite] }),
        } as Response);
      }
      if (url === "/api/groups/g1/invite-links") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ links: [] }),
        } as Response);
      }
      if (
        url === "/api/groups/g1/invites/i1/resend" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invite: updatedInvite }),
        } as Response);
      }
      return Promise.reject(new Error("unknown url"));
    });
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);

    render(<MemberInviteScreen groupId="g1" onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Resend invitation"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/groups/g1/invites/i1/resend",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("delivered")).toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("cancels invite", async () => {
    const invite = {
      id: "i1",
      name: "Alice",
      contact: "alice@example.com",
      method: "email" as const,
      invitedBy: "You",
      invitedAt: "2024-01-15T00:00:00Z",
      status: "sent" as const,
      expiresAt: "2099-01-22T00:00:00Z",
      attempts: 1,
    };

    const fetchMock = vi.fn((url: string, options?: any) => {
      if (url === "/api/groups/g1/invites") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ invites: [invite] }),
        } as Response);
      }
      if (url === "/api/groups/g1/invite-links") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ links: [] }),
        } as Response);
      }
      if (url === "/api/groups/g1/invites/i1" && options?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }
      return Promise.reject(new Error("unknown url"));
    });
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);

    render(<MemberInviteScreen groupId="g1" onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Cancel invitation"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/groups/g1/invites/i1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText("Alice")).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalled();
  });
});
