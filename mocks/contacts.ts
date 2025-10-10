import type { MatchedContact } from "../components/contact-sync/types";

const demoMatches: MatchedContact[] = [
  {
    id: "1",
    name: "Alice Johnson",
    phone: "+1234567890",
    email: "alice@example.com",
    status: "existing_user",
    userId: "u1",
    username: "alice",
    mutualFriends: 3,
    avatar: "https://example.com/avatar1.png",
  },
  {
    id: "2",
    name: "Bob Smith",
    phone: "+1234567891",
    email: "bob@example.com",
    status: "not_on_app",
  },
  {
    id: "3",
    name: "Charlie Brown",
    phone: "+1234567892",
    email: "charlie@example.com",
    status: "existing_user",
    userId: "u3",
    username: "charlie",
    avatar: "https://example.com/avatar3.png",
  },
];

export async function handle(path: string, init: RequestInit = {}) {
  if (path === "/contacts/match" && init.method === "POST") {
    return { contacts: demoMatches };
  }
  return null;
}
