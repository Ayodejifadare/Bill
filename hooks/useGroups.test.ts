import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGroups, Group } from "./useGroups";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useGroups", () => {
  it("fetches groups successfully", async () => {
    const apiGroups = [
      { id: "1", name: "Test Group", members: ["u1"], color: "bg-blue-500" },
    ];

    const expected: Group[] = [
      {
        id: "1",
        name: "Test Group",
        description: "",
        memberCount: 1,
        totalSpent: 0,
        recentActivity: "",
        members: ["u1"],
        isAdmin: false,
        lastActive: null,
        pendingBills: 0,
        color: "bg-blue-500",
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ groups: apiGroups }),
    } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.groups).toEqual(expected);
  });

  it("handles empty group list", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [] }),
    } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.groups).toEqual([]);
  });

  it("handles fetch error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
    } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("joins a group", async () => {
    const newGroup: Group = {
      id: "2",
      name: "New Group",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: [],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group: newGroup }),
      } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.joinGroup(newGroup.id);

    await waitFor(() => expect(result.current.groups).toEqual([newGroup]));
  });

  it("creates a group", async () => {
    const newGroup: Group = {
      id: "3",
      name: "Created Group",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: [],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group: newGroup }),
      } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const created = await result.current.createGroup({
      name: newGroup.name,
      description: newGroup.description,
      color: newGroup.color,
      memberIds: [],
    });

    expect(created).toEqual(newGroup);
    await waitFor(() => expect(result.current.groups).toEqual([newGroup]));
  });

  it("updates groups after creating a new group", async () => {
    const existing: Group = {
      id: "1",
      name: "Existing",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: ["a"],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };

    const newGroup: Group = {
      id: "2",
      name: "New",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: ["a"],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [existing] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group: newGroup }),
      } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.createGroup({
      name: newGroup.name,
      description: newGroup.description,
      color: newGroup.color,
      memberIds: [],
    });

    await waitFor(() =>
      expect(result.current.groups).toEqual([existing, newGroup]),
    );
  });

  it("leaves a group", async () => {
    const group1: Group = {
      id: "1",
      name: "First",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: ["a"],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };
    const group2: Group = {
      id: "2",
      name: "Second",
      description: "",
      memberCount: 1,
      totalSpent: 0,
      recentActivity: "",
      members: ["a"],
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: "",
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [group1, group2] }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ group: group2 }),
      } as unknown as Response);

    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.leaveGroup(group2.id);

    await waitFor(() => expect(result.current.groups).toEqual([group1]));
  });
});
