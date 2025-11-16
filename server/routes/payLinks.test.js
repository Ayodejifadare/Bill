/**
 * @vitest-environment node
 */
import express from "express";
import request from "supertest";
import payLinkRoutes, { publicPayLinkRoutes } from "./payLinks.js";
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import jwt from "jsonwebtoken";

const sign = (userId) =>
  jwt.sign({ userId, tokenVersion: 0 }, process.env.JWT_SECRET);

process.env.ALLOW_HEADER_AUTH = "true";

function createTestContext() {
  const users = new Map([
    ["u1", { id: "u1", name: "Jordan", avatar: "", tokenVersion: 0 }],
    ["u2", { id: "u2", name: "Avery", avatar: "", tokenVersion: 0 }],
  ]);

  const paymentMethods = new Map([
    [
      "pm1",
      {
        id: "pm1",
        type: "bank",
        bank: "Mock Bank",
        accountNumber: "11111111",
        accountName: "Jordan",
        sortCode: "00-00-01",
        routingNumber: "021000021",
        provider: null,
        phoneNumber: null,
        userId: "u1",
      },
    ],
  ]);

  const payLinks = new Map();

  const prisma = {
    user: {
      findUnique: async ({ where }) => {
        if (!where?.id) return null;
        const user = users.get(where.id);
        return user ? { tokenVersion: user.tokenVersion } : null;
      },
    },
    payLink: {
      findFirst: async ({ where }) => {
        if (!where?.id) return null;
        const link = payLinks.get(where.id);
        if (!link) return null;
        if (where.userId && link.userId !== where.userId) return null;
        return { ...link };
      },
      findUnique: async ({ where, include }) => {
        let link = null;
        if (where?.id && payLinks.has(where.id)) {
          link = payLinks.get(where.id);
        }
        if (!link && where?.token) {
          link = Array.from(payLinks.values()).find((pl) => pl.token === where.token);
        }
        if (!link) return null;
        const result = { ...link };
        if (include?.user) {
          const owner = users.get(link.userId);
          result.user = owner
            ? { id: owner.id, name: owner.name, avatar: owner.avatar }
            : null;
        }
        if (include?.paymentMethod) {
          const method = paymentMethods.get(link.paymentMethodId);
          result.paymentMethod = method
            ? {
                type: method.type,
                bank: method.bank,
                accountName: method.accountName,
                accountNumber: method.accountNumber,
                sortCode: method.sortCode,
                routingNumber: method.routingNumber,
                provider: method.provider,
                phoneNumber: method.phoneNumber,
              }
            : null;
        }
        if (include?.paymentRequest) {
          result.paymentRequest = null;
        }
        return result;
      },
      update: async ({ where, data }) => {
        if (!where?.id) throw new Error("missing id");
        const existing = payLinks.get(where.id);
        if (!existing) throw new Error("not found");
        const updated = { ...existing, ...data };
        payLinks.set(where.id, updated);
        return { ...updated };
      },
      deleteMany: async () => {
        payLinks.clear();
      },
      create: async ({ data }) => {
        payLinks.set(data.id, { ...data });
        return { ...data };
      },
    },
    paymentMethod: {
      findFirst: async ({ where }) => {
        if (!where?.id) return null;
        const method = paymentMethods.get(where.id);
        if (!method) return null;
        if (where.userId && method.userId !== where.userId) return null;
        return { ...method };
      },
    },
    paymentRequest: {
      findFirst: async () => null,
      update: async () => null,
      updateMany: async () => null,
      create: async () => null,
    },
    notification: {
      deleteMany: async () => null,
    },
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
  });
  app.use("/api/pay-links", payLinkRoutes);
  app.use("/pay-links", publicPayLinkRoutes);

  return { app, prisma, payLinks };
}

describe("Pay link routes", () => {
  let context;

  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(() => {
    context = createTestContext();
  });

  it("requires authentication for private routes", async () => {
    const res = await request(context.app).get("/api/pay-links/pl-unknown");
    expect(res.status).toBe(401);

    const invalid = await request(context.app)
      .get("/api/pay-links/pl-unknown")
      .set("Authorization", "Bearer invalid.token.here")
      .send();
    expect(invalid.status).toBe(401);
  });

  it("returns sanitized pay link payload for owners", async () => {
    context.payLinks.set("pl-private", {
      id: "pl-private",
      slug: "rent-top-up",
      token: "token-private",
      title: "Rent top up",
      message: "Send via transfer",
      amount: 240,
      currency: "USD",
      status: "ACTIVE",
      userId: "u1",
      paymentMethodId: "pm1",
      recipientName: "Casey",
      recipientEmail: "casey@example.com",
      expiresAt: null,
      paymentRequestId: null,
    });

    const res = await request(context.app)
      .get("/api/pay-links/pl-private")
      .set("Authorization", `Bearer ${sign("u1")}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.payLink).toMatchObject({
      id: "pl-private",
      slug: "rent-top-up",
      token: "token-private",
      paymentMethodId: "pm1",
    });
    expect(res.body.payLink).not.toHaveProperty("userId");
  });

  it("serves public pay link data without exposing private fields", async () => {
    context.payLinks.set("pl-public", {
      id: "pl-public",
      slug: "trip-fund",
      token: "public-token",
      title: "Trip fund",
      message: "Send via ACH",
      amount: 125,
      currency: "USD",
      status: "ACTIVE",
      userId: "u1",
      paymentMethodId: "pm1",
      recipientName: "Jamie",
      expiresAt: null,
      paymentRequestId: null,
    });

    const res = await request(context.app).get("/pay-links/public-token");

    expect(res.status).toBe(200);
    expect(res.body.payLink).toMatchObject({
      slug: "trip-fund",
      amount: 125,
      owner: { name: "Jordan" },
      bankTransferInstructions: expect.objectContaining({
        bank: "Mock Bank",
        accountNumber: "11111111",
      }),
    });
    expect(res.body.payLink).not.toHaveProperty("token");
    expect(res.body.payLink).not.toHaveProperty("paymentMethodId");
  });
});
