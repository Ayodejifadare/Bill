import { apiClient } from "./apiClient";

export type LookupIdentifierType = "email" | "phone" | "username";

export type LookupRelationshipStatus =
  | "none"
  | "friends"
  | "pending_outgoing"
  | "pending_incoming"
  | "self";

export interface LookupUserResult {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  relationshipStatus: LookupRelationshipStatus;
  matchedBy?: LookupIdentifierType | string | null;
}

export async function lookupUserByIdentifier(
  identifier: string,
  type?: LookupIdentifierType,
): Promise<LookupUserResult | null> {
  const params = new URLSearchParams({ identifier: identifier.trim() });
  if (type) {
    params.set("type", type);
  }

  const data = await apiClient(`/users/lookup?${params.toString()}`);
  if (!data || !data.user) {
    return null;
  }

  const user = data.user;
  return {
    id: user.id,
    name: user.name ?? user.email ?? "Unknown User",
    email: user.email ?? null,
    phone: user.phone ?? null,
    avatar: user.avatar ?? null,
    relationshipStatus: user.relationshipStatus ?? "none",
    matchedBy: user.matchedBy ?? type ?? null,
  };
}
