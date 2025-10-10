type LookupIdentifierType = "email" | "phone" | "username";

type LookupRelationshipStatus =
  | "none"
  | "friends"
  | "pending_outgoing"
  | "pending_incoming"
  | "self";

interface MockLookupFixture {
  identifiers: Partial<Record<LookupIdentifierType, string>>;
  user: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    relationshipStatus: LookupRelationshipStatus;
  };
}

const VALID_LOOKUP_TYPES: LookupIdentifierType[] = [
  "email",
  "phone",
  "username",
];

function normalizeIdentifier(
  value: string,
  type: LookupIdentifierType,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (type) {
    case "email":
      return trimmed.toLowerCase();
    case "phone": {
      const digits = trimmed.replace(/\D/g, "");
      return digits || null;
    }
    case "username":
      return trimmed.replace(/^@+/, "").toLowerCase();
    default:
      return null;
  }
}

function inferLookupType(value: string): LookupIdentifierType {
  const trimmed = value.trim();
  if (!trimmed) return "email";
  if (trimmed.includes("@")) return "email";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 7) return "phone";
  return "username";
}

export const mockUsers = {
  demo: {
    id: "demo-user",
    name: "Demo User",
    email: "demo@example.com",
    phone: "+1 (555) 123-0000",
    avatar: "https://example.com/avatar-demo.png",
  },
  friend: {
    id: "friend-user",
    name: "Friendly Neighbor",
    email: "friend@example.com",
    phone: "+1 (555) 123-0001",
    avatar: "https://example.com/avatar-friend.png",
  },
  pendingOutgoing: {
    id: "pending-user",
    name: "Pending Pat",
    email: "pending@example.com",
    phone: "+1 (555) 123-0002",
    avatar: "https://example.com/avatar-pending.png",
  },
  stranger: {
    id: "new-user",
    name: "New User",
    email: "newperson@example.com",
    phone: "+1 (555) 123-0003",
    avatar: "https://example.com/avatar-new.png",
  },
} as const;

export const lookupUserFixtures: MockLookupFixture[] = [
  {
    identifiers: {
      email: mockUsers.demo.email,
      phone: mockUsers.demo.phone,
      username: "demouser",
    },
    user: {
      ...mockUsers.demo,
      relationshipStatus: "self",
    },
  },
  {
    identifiers: {
      email: mockUsers.friend.email,
      phone: mockUsers.friend.phone,
      username: "friendlyneigh",
    },
    user: {
      ...mockUsers.friend,
      relationshipStatus: "friends",
    },
  },
  {
    identifiers: {
      email: mockUsers.pendingOutgoing.email,
      phone: mockUsers.pendingOutgoing.phone,
      username: "pendingpat",
    },
    user: {
      ...mockUsers.pendingOutgoing,
      relationshipStatus: "pending_outgoing",
    },
  },
  {
    identifiers: {
      email: mockUsers.stranger.email,
      phone: mockUsers.stranger.phone,
      username: "newperson",
    },
    user: {
      ...mockUsers.stranger,
      relationshipStatus: "none",
    },
  },
];

export const demoProfile = {
  ...mockUsers.demo,
  createdAt: new Date().toISOString(),
  kycStatus: "verified" as const,
};

export const demoStats = {
  totalSent: 1200,
  totalReceived: 800,
  totalSplits: 5,
  friends: 10,
};

function findLookupMatch(identifier: string, type: LookupIdentifierType) {
  const normalized = normalizeIdentifier(identifier, type);
  if (!normalized) return null;

  for (const fixture of lookupUserFixtures) {
    const candidate = fixture.identifiers[type];
    if (!candidate) continue;
    const normalizedCandidate = normalizeIdentifier(candidate, type);
    if (normalizedCandidate && normalizedCandidate === normalized) {
      return { fixture, matchedType: type };
    }
  }

  return null;
}

export async function handle(path: string, _init?: RequestInit) {
  // Support both /users/* and /api/users/*
  if (/^\/(api\/)?users\/[^/]+\/stats$/.test(path)) {
    return { stats: demoStats };
  }

  if (/^\/(api\/)?users\/[^/]+\/payment-methods$/.test(path)) {
    return [
      {
        id: "pm-bank-1",
        type: "bank",
        bankName: "Mock Bank",
        accountHolderName: "Demo User",
        accountNumber: "1234567890",
        sortCode: "044",
        isDefault: true,
      },
      {
        id: "pm-mm-1",
        type: "mobile_money",
        provider: "Opay",
        phoneNumber: "+2348012345678",
        isDefault: false,
      },
    ];
  }

  if (/^\/(api\/)?users\/lookup/.test(path)) {
    const url = new URL(path, "http://mock.api");
    const identifier = url.searchParams.get("identifier")?.trim() ?? "";
    if (!identifier) {
      return { user: null };
    }

    const typeParam = url.searchParams.get("type")?.trim().toLowerCase();
    if (
      typeParam &&
      !VALID_LOOKUP_TYPES.includes(typeParam as LookupIdentifierType)
    ) {
      return { user: null };
    }

    const lookupType =
      (typeParam as LookupIdentifierType) ?? inferLookupType(identifier);
    let match = findLookupMatch(identifier, lookupType);

    if (!match && !typeParam) {
      for (const type of VALID_LOOKUP_TYPES) {
        match = findLookupMatch(identifier, type);
        if (match) break;
      }
    }

    if (!match) {
      return { user: null };
    }

    const { fixture, matchedType } = match;

    return {
      user: {
        ...fixture.user,
        matchedBy: matchedType,
      },
    };
  }

  if (/^\/(api\/)?users\/[^/]+$/.test(path)) {
    const parts = path.split("/");
    const id = parts[parts.length - 1];
    return { user: { ...demoProfile, id } };
  }

  return null;
}
