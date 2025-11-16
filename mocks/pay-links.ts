const mockOwner = {
  id: "mock-user",
  name: "Jordan Smith",
  avatar: "https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?w=128&h=128&fit=crop",
};

const paymentMethods = {
  "pm-demo-bank": {
    id: "pm-demo-bank",
    type: "bank",
    bank: "Community Credit Union",
    accountName: "Jordan Smith",
    accountNumber: "28700192",
    sortCode: "04-00-04",
    routingNumber: "021000021",
  },
  "pm-demo-mobile": {
    id: "pm-demo-mobile",
    type: "mobile_money",
    provider: "M-Pesa",
    phoneNumber: "+254700000000",
    accountName: "Jordan Smith",
  },
} as const;

type PaymentMethodId = keyof typeof paymentMethods;

type PayLinkRecord = {
  id: string;
  slug: string;
  token: string;
  title: string;
  message: string;
  amount: number;
  currency: string;
  status: "ACTIVE" | "REVOKED" | "FULFILLED" | "EXPIRED";
  expiresAt: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  paymentMethodId: PaymentMethodId;
  paymentRequestId?: string | null;
};

let payLinks: PayLinkRecord[] = [
  {
    id: "pl-demo-001",
    slug: "security-deposit",
    token: "demo-token",
    title: "Security deposit",
    message: "Send the transfer before move-in.",
    amount: 150,
    currency: "USD",
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    recipientName: "Future Roommate",
    recipientEmail: "roommate@example.com",
    paymentMethodId: "pm-demo-bank",
    paymentRequestId: "req-demo-01",
  },
  {
    id: "pl-demo-fulfilled",
    slug: "weekend-getaway",
    token: "fulfilled-token",
    title: "Weekend getaway share",
    message: "Chip in for the cabin booking.",
    amount: 85,
    currency: "USD",
    status: "FULFILLED",
    expiresAt: null,
    recipientName: "Avery",
    recipientPhone: "+15555550123",
    paymentMethodId: "pm-demo-mobile",
  },
];

let payLinkCounter = payLinks.length + 1;

function buildBankInstructions(methodId: PaymentMethodId) {
  const method = paymentMethods[methodId];
  if (!method) return null;
  return {
    type: method.type,
    bank: "bank" in method ? method.bank : undefined,
    accountName: method.accountName,
    accountNumber: method.accountNumber,
    sortCode: method.sortCode,
    routingNumber: method.routingNumber,
    provider: method.provider,
    phoneNumber: method.phoneNumber,
  };
}

function sanitizePrivate(link: PayLinkRecord) {
  return {
    id: link.id,
    slug: link.slug,
    token: link.token,
    title: link.title,
    message: link.message,
    amount: link.amount,
    currency: link.currency,
    status: link.status,
    expiresAt: link.expiresAt,
    recipientName: link.recipientName,
    recipientEmail: link.recipientEmail,
    recipientPhone: link.recipientPhone,
    paymentMethodId: link.paymentMethodId,
    paymentRequestId: link.paymentRequestId ?? null,
  };
}

function sanitizePublic(link: PayLinkRecord) {
  return {
    slug: link.slug,
    title: link.title,
    message: link.message,
    amount: link.amount,
    currency: link.currency,
    status: link.status,
    expiresAt: link.expiresAt,
    recipientName: link.recipientName,
    recipientEmail: link.recipientEmail,
    recipientPhone: link.recipientPhone,
    paymentRequestId: link.paymentRequestId ?? null,
    owner: { name: mockOwner.name, avatar: mockOwner.avatar },
    bankTransferInstructions: buildBankInstructions(link.paymentMethodId),
  };
}

function readJsonBody(init?: RequestInit) {
  if (!init?.body) return {};
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  return init.body as Record<string, any>;
}

function slugify(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function handle(path: string, init?: RequestInit) {
  if (/^\/api\/pay-links/.test(path)) {
    const idMatch = path.match(/^\/api\/pay-links\/([^/]+)/);
    if (init?.method === "POST" && !idMatch) {
      const payload = readJsonBody(init);
      const id = `pl-demo-${payLinkCounter.toString().padStart(3, "0")}`;
      const slugSource = payload.slug || payload.title || `pay-link-${payLinkCounter}`;
      const slug = slugify(slugSource || id);
      const token = `mock-token-${Date.now()}`;
      const paymentMethodId = (payload.paymentMethodId as PaymentMethodId) || "pm-demo-bank";
      const newLink: PayLinkRecord = {
        id,
        slug,
        token,
        title: payload.title || "New pay link",
        message: payload.message || "Send a manual transfer",
        amount: Number(payload.amount) || 0,
        currency: payload.currency || "USD",
        status: "ACTIVE",
        expiresAt: payload.expiresAt || null,
        recipientName: payload.recipientName,
        recipientEmail: payload.recipientEmail,
        recipientPhone: payload.recipientPhone,
        paymentMethodId,
        paymentRequestId: payload.paymentRequestId || null,
      };
      payLinkCounter += 1;
      payLinks = [newLink, ...payLinks];
      return { payLink: sanitizePrivate(newLink) };
    }

    if (idMatch && (!init?.method || init.method === "GET")) {
      const link = payLinks.find((pl) => pl.id === idMatch[1]);
      if (!link) {
        return new Response(JSON.stringify({ error: "Pay link not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return { payLink: sanitizePrivate(link) };
    }

    if (idMatch && init?.method === "POST" && path.endsWith("/revoke")) {
      payLinks = payLinks.map((link) =>
        link.id === idMatch[1] ? { ...link, status: "REVOKED" } : link,
      );
      const link = payLinks.find((pl) => pl.id === idMatch[1]);
      return { payLink: link ? sanitizePrivate(link) : null };
    }

    if (idMatch && init?.method === "POST" && path.endsWith("/regenerate")) {
      payLinks = payLinks.map((link) =>
        link.id === idMatch[1]
          ? { ...link, token: `mock-token-${Date.now()}`, status: "ACTIVE" }
          : link,
      );
      const link = payLinks.find((pl) => pl.id === idMatch[1]);
      return { payLink: link ? sanitizePrivate(link) : null };
    }
  }

  if (/^\/pay-links\//.test(path)) {
    const markPaidMatch = path.match(/^\/pay-links\/([^/]+)\/mark-paid/);
    if (markPaidMatch && init?.method === "POST") {
      const link = payLinks.find((pl) => pl.token === markPaidMatch[1]);
      if (!link) {
        return new Response(JSON.stringify({ error: "Pay link not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      link.status = "FULFILLED";
      return { payLink: sanitizePublic(link) };
    }

    const tokenMatch = path.match(/^\/pay-links\/([^/]+)/);
    if (tokenMatch) {
      const link = payLinks.find((pl) => pl.token === tokenMatch[1]);
      if (!link) {
        return new Response(JSON.stringify({ error: "Pay link not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (link.status === "REVOKED") {
        return new Response(JSON.stringify({ error: "Pay link is no longer active" }), {
          status: 410,
          headers: { "Content-Type": "application/json" },
        });
      }
      return { payLink: sanitizePublic(link) };
    }
  }

  return null;
}
