import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CreateGroupScreen } from "./CreateGroupScreen";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  (global.fetch as any)?.mockClear?.();
});

describe("CreateGroupScreen", () => {
  it("validates required fields", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] }),
      } as unknown as Response);
    render(<CreateGroupScreen onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    fireEvent.change(
      screen.getByPlaceholderText(
        "e.g., Work Squad, Roommates, Travel Buddies",
      ),
      { target: { value: "Trip" } },
    );
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create Group" }),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Create Group" })).toBeDisabled();
  });

  it("creates group successfully", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          friends: [{ id: "1", name: "Alice", avatar: "A", email: "a@a.com" }],
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group: { id: "g1" } }),
      } as unknown as Response);
    const onNavigate = vi.fn();
    render(
      <CreateGroupScreen
        onNavigate={onNavigate}
        initialSelectedFriendIds={["1"]}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        "e.g., Work Squad, Roommates, Travel Buddies",
      ),
      { target: { value: "Trip" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("What will you use this group for?"),
      { target: { value: "Desc" } },
    );
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Create Group" }).length,
      ).toBeGreaterThan(0),
    );

    const buttons = screen.getAllByRole("button", { name: "Create Group" });
    const createBtn = buttons[buttons.length - 1];
    fireEvent.click(createBtn);

    await waitFor(() =>
      expect(onNavigate).toHaveBeenCalledWith("group-details", {
        groupId: "g1",
      }),
    );
    expect((global.fetch as any).mock.calls[2][0]).toBe("/api/groups");
    const body = JSON.parse((global.fetch as any).mock.calls[2][1].body);
    expect(body).toEqual({
      name: "Trip",
      description: "Desc",
      color: "bg-blue-500",
      memberIds: ["1"],
    });
    expect(toast.success).toHaveBeenCalled();
  });
});
