import type { Group } from "../hooks/useGroups";
import type { ExternalAccount } from "../utils/split-bill-api";

let groups: Group[] = [
  {
    id: "1",
    name: "Weekend Trip",
    description: "Friends getaway",
    memberCount: 3,
    totalSpent: 0,
    recentActivity: "",
    members: ["WT", "FG", "AB"],
    isAdmin: true,
    lastActive: new Date().toISOString(),
    pendingBills: 0,
    color: "bg-red-500",
  },
];

const accounts: ExternalAccount[] = [
  {
    id: "1",
    name: "Mock Bank",
    type: "bank",
    bankName: "Mock Bank",
    accountNumber: "12345678",
    accountHolderName: "Mock User",
    routingNumber: "021000021",
    isDefault: true,
    createdBy: "Mock User",
    createdDate: new Date().toISOString(),
  },
];

export async function handle(path: string, init: RequestInit = {}) {
  if (path === "/groups" && (!init.method || init.method === "GET")) {
    return {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        members: g.members,
        color: g.color,
      })),
    };
  }
    // Return a specific group with full member objects compatible with split-bill API
  if (/^\/groups\/[^/]+$/.test(path) && (!init.method || init.method === "GET")) {
    const groupId = path.split("/")[2];
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { group: null };

    // Provide member objects shaped as { user: { id, name, ... } }
    // Map the seeded mock members to a stable set of users
    const mockUsers = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
      { id: "4", name: "Dana" },
      { id: "5", name: "Evan" },
    ];
    const members = (group.members || []).map((_, idx) => ({
      user: mockUsers[idx % mockUsers.length],
      role: idx === 0 ? "admin" : "member",
      joinedAt: new Date().toISOString(),
    }));

    return {
      group: {
        id: group.id,
        name: group.name,
        members,
        color: group.color,
      },
    };
  }
if (path === "/groups" && init.method === "POST") {
    const body = init.body ? JSON.parse(init.body as string) : {};
    const newGroup: Group = {
      id: String(groups.length + 1),
      name: body.name,
      description: body.description,
      memberCount: body.memberIds?.length || 0,
      totalSpent: 0,
      recentActivity: "",
      members: [],
      isAdmin: true,
      lastActive: new Date().toISOString(),
      pendingBills: 0,
      color: body.color || "bg-blue-500",
    };
    groups.push(newGroup);
    return { group: newGroup };
  }
  if (/^\/groups\/[^/]+\/join$/.test(path)) {
    const groupId = path.split("/")[2];
    const group = groups.find((g) => g.id === groupId);
    return { group };
  }
  if (/^\/groups\/[^/]+\/leave$/.test(path)) {
    const groupId = path.split("/")[2];
    groups = groups.filter((g) => g.id !== groupId);
    return { success: true };
  }
  if (/^\/groups\/[^/]+\/accounts$/.test(path)) {
    return { accounts };
  }
  return null;
}

