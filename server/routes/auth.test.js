/**
 * @vitest-environment node
 */
import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const getTokenMock = vi.fn();
const verifyIdTokenMock = vi.fn();
const revokeTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(() => ({
    getToken: getTokenMock,
    verifyIdToken: verifyIdTokenMock,
    revokeToken: revokeTokenMock,
  })),
}));

let authRouter;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.GOOGLE_CLIENT_ID = "test-google-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  authRouter = (await import("./auth.js")).default;
});

beforeEach(() => {
  getTokenMock.mockReset();
  verifyIdTokenMock.mockReset();
  revokeTokenMock.mockReset();
  revokeTokenMock.mockResolvedValue(undefined);
});

describe("Auth routes - OTP validation", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = {};
      next();
    });
    app.use("/auth", authRouter);
  });

  it("rejects OTPs that are not 6 digits", async () => {
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+12345678901", otp: "1234" });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatchObject({
      path: "otp",
      msg: "OTP must be exactly 6 digits",
    });
  });

  it("rejects OTPs that contain non-numeric characters", async () => {
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+12345678901", otp: "12a456" });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatchObject({
      path: "otp",
      msg: "OTP must contain only numbers",
    });
  });
});

describe("Auth routes - register", () => {
  let app;
  let findUnique;
  let findFirst;
  let create;

  beforeEach(() => {
    findUnique = vi.fn(async () => null);
    findFirst = vi.fn(async () => null);
    create = vi.fn(async ({ data }) => ({ ...data, id: "u1" }));

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = {
        user: {
          findUnique,
          findFirst,
          create,
        },
      };
      next();
    });
    app.use("/auth", authRouter);
  });

  it("creates a user and combines first and last name", async () => {
    vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed");

    const res = await request(app).post("/auth/register").send({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+12345678901",
      password: "secret123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      name: "John Doe",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { phone: "+12345678901" },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "+12345678901" }),
      }),
    );

    vi.restoreAllMocks();
  });

  it("rejects registration when phone already exists", async () => {
    findFirst.mockResolvedValueOnce({ id: "existing" });

    const res = await request(app).post("/auth/register").send({
      firstName: "Jane",
      lastName: "Roe",
      email: "jane@example.com",
      phone: "+12345678901",
      password: "secret123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Phone already registered" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("Auth routes - Google OAuth", () => {
  let app;
  let findFirst;
  let create;
  let update;
  let upsert;

  beforeEach(() => {
    findFirst = vi.fn(async () => null);
    create = vi.fn(async ({ data }) => ({
      id: "user-new",
      email: data.email,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: null,
      avatar: data.avatar,
      balance: 0,
      region: data.region,
      currency: data.currency,
      onboardingCompleted: data.onboardingCompleted,
      phoneVerified: false,
      emailVerified: data.emailVerified,
      idVerified: false,
      documentsSubmitted: false,
      tokenVersion: 0,
      googleId: data.googleId,
    }));
    update = vi.fn(async ({ data }) => ({
      id: "user-existing",
      email: "google-user@example.com",
      name: data.name || "Existing User",
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: null,
      avatar: data.avatar ?? null,
      balance: 0,
      region: "NG",
      currency: "NGN",
      onboardingCompleted: true,
      phoneVerified: false,
      emailVerified: data.emailVerified ?? false,
      idVerified: false,
      documentsSubmitted: false,
      tokenVersion: 1,
      googleId: data.googleId || "existing-google-id",
    }));
    upsert = vi.fn(async () => ({}));

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = {
        user: {
          findFirst,
          create,
          update,
        },
        notificationPreference: {
          upsert,
        },
      };
      next();
    });
    app.use("/auth", authRouter);
  });

  it("creates a user when Google profile is new", async () => {
    getTokenMock.mockResolvedValueOnce({
      tokens: {
        id_token: "test-id-token",
        access_token: "access-token",
      },
    });
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => ({
        sub: "google-123",
        email: "new-user@example.com",
        email_verified: true,
        name: "New User",
        given_name: "New",
        family_name: "User",
        picture: "https://example.com/avatar.png",
      }),
    });

    const res = await request(app)
      .post("/auth/google")
      .send({ code: "auth-code", region: "US", currency: "USD" });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user).toMatchObject({
      email: "new-user@example.com",
      name: "New User",
    });
    expect(res.body.user.googleId).toBeUndefined();
    expect(res.body.token).toBeDefined();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleId: "google-123",
          email: "new-user@example.com",
        }),
      }),
    );
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: "user-new" },
      update: {},
      create: expect.objectContaining({ userId: "user-new" }),
    });
    expect(revokeTokenMock).toHaveBeenCalledWith("access-token");
  });

  it("links Google account to existing user", async () => {
    findFirst.mockResolvedValueOnce({
      id: "user-existing",
      email: "google-user@example.com",
      name: "",
      firstName: null,
      lastName: null,
      phone: null,
      avatar: null,
      balance: 0,
      region: "NG",
      currency: "NGN",
      onboardingCompleted: true,
      phoneVerified: false,
      emailVerified: false,
      idVerified: false,
      documentsSubmitted: false,
      tokenVersion: 2,
      googleId: null,
    });

    getTokenMock.mockResolvedValueOnce({
      tokens: { id_token: "existing-id-token" },
    });
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => ({
        sub: "google-999",
        email: "google-user@example.com",
        email_verified: true,
        given_name: "Linked",
        family_name: "User",
      }),
    });

    const res = await request(app)
      .post("/auth/google")
      .send({ code: "auth-code" });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-existing" },
      data: expect.objectContaining({
        googleId: "google-999",
        emailVerified: true,
        firstName: "Linked",
        lastName: "User",
      }),
      select: expect.any(Object),
    });
  });
});

describe("Auth routes - me and logout", () => {
  let app;
  let findUnique;
  let update;
  let token;

  const user = {
    id: "u1",
    email: "john@example.com",
    name: "John Doe",
    balance: 0,
    avatar: null,
    createdAt: new Date("2023-01-01"),
    tokenVersion: 1,
    phoneVerified: true,
    emailVerified: true,
    idVerified: false,
    documentsSubmitted: false,
    onboardingCompleted: false,
  };

  beforeEach(() => {
    findUnique = vi.fn(async () => ({ ...user }));
    update = vi.fn(async () => ({}));

    token = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
    );

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = {
        user: {
          findUnique,
          update,
        },
      };
      next();
    });
    app.use("/auth", authRouter);
  });

  it("returns current user with valid token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id });
    expect(findUnique).toHaveBeenCalled();
  });

  it("responds with 401 when no token provided for /me", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "No token provided" });
  });

  it("logs out user with valid token", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Logged out" });
    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it("responds with 401 when no token provided for /logout", async () => {
    const res = await request(app).post("/auth/logout");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "No token provided" });
  });
});
