import type { Friend } from "../hooks/useFriends";

const friends: Friend[] = [
  { id: "1", name: "Alice", status: "active" },
  { id: "2", name: "Bob", status: "active" },
  { id: "3", name: "Charlie", status: "active" },
];

export async function handle(path: string, _init?: RequestInit) {
  if (path.startsWith("/friends/search")) {
    const url = new URL(path, "http://example.com");
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const results = friends.filter((f) => f.name.toLowerCase().includes(q));
    return { friends: results };
  }

  if (path === "/friends") {
    return { friends };
  }

  return null;
}
