/**
 * @vitest-environment node
 */
import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";

let authenticate;
let onboardingRedirect;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.ALLOW_HEADER_AUTH = "true";
  authenticate = (await import("./auth.js")).default;
  onboardingRedirect = (await import("./onboarding.js")).default;
});

describe("onboarding middleware", () => {
  let app;
  let findUnique;

  beforeEach(() => {
    findUnique = vi.fn();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = { user: { findUnique } };
      next();
    });
    app.use(authenticate);
    app.use(onboardingRedirect);
    app.get("/protected", (req, res) => res.json({ ok: true }));
  });

  it("blocks users who have not completed onboarding", async () => {
    findUnique.mockResolvedValue({ onboardingCompleted: false });
    const res = await request(app).get("/protected").set("x-user-id", "u1");
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "onboarding_required" });
  });

  it("allows users who completed onboarding", async () => {
    findUnique.mockResolvedValue({ onboardingCompleted: true });
    const res = await request(app).get("/protected").set("x-user-id", "u1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("defers to auth middleware when unauthenticated", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "No token provided" });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
