/**
 * @vitest-environment node
 */
process.env.JWT_SECRET = "test-secret";
process.env.ALLOW_HEADER_AUTH = "true";

import express from "express";
import request from "supertest";
import groupAccountRouter from "./groupAccounts.js";
import { PrismaClient } from "@prisma/client";
import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

describe("Group account routes", () => {
  let app;
  let prisma;
  const dbPath = path.join(__dirname, "..", "prisma", "group-accounts-test.db");

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`;
    const cwd = path.join(__dirname, "..");
    execSync("npx prisma generate", { cwd, stdio: "inherit" });
    execSync("npx prisma migrate deploy", { cwd, stdio: "inherit" });
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await prisma.groupAccount.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: { id: "u1", email: "u1@example.com", name: "User 1", region: "NG" },
    });
    await prisma.group.create({ data: { id: "g1", name: "Group 1" } });
    await prisma.groupMember.create({
      data: { groupId: "g1", userId: "u1", role: "ADMIN" },
    });

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = prisma;
      next();
    });
    app.use("/groups/:groupId/accounts", groupAccountRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("lists accounts", async () => {
    await prisma.groupAccount.create({
      data: {
        id: "a1",
        groupId: "g1",
        createdById: "u1",
        type: "BANK",
        bank: "Access Bank",
        accountNumber: "1234567890",
        accountName: "Test Bank",
        isDefault: true,
        name: "Test Bank - Access Bank",
      },
    });
    await prisma.groupAccount.create({
      data: {
        id: "a2",
        groupId: "g1",
        createdById: "u1",
        type: "MOBILE_MONEY",
        provider: "Opay",
        phoneNumber: "+2348012345678",
        isDefault: false,
        name: "+2348012345678 - Opay",
      },
    });

    const res = await request(app)
      .get("/groups/g1/accounts")
      .set("x-user-id", "u1");
    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(2);
    expect(res.body.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bank", bankName: "Access Bank" }),
        expect.objectContaining({ type: "mobile_money", provider: "Opay" }),
      ]),
    );
  });

  it("creates bank and mobile money accounts", async () => {
    const bankRes = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "bank",
        bank: "Access Bank",
        accountNumber: "1234567890",
        accountName: "Test Account",
      });
    expect(bankRes.status).toBe(201);
    expect(bankRes.body.account).toMatchObject({
      type: "bank",
      bankName: "Access Bank",
      accountHolderName: "Test Account",
      isDefault: true,
    });

    const mmRes = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "mobile_money",
        provider: "Opay",
        phoneNumber: "+2348012345678",
      });
    expect(mmRes.status).toBe(201);
    expect(mmRes.body.account).toMatchObject({
      type: "mobile_money",
      provider: "Opay",
      phoneNumber: "+2348012345678",
      isDefault: false,
    });
  });

  it("sets an account as default", async () => {
    const first = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "bank",
        bank: "Access Bank",
        accountNumber: "1234567890",
        accountName: "First",
      });
    const second = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "mobile_money",
        provider: "Opay",
        phoneNumber: "+2348012345678",
      });

    const secondId = second.body.account.id;
    const res = await request(app)
      .put(`/groups/g1/accounts/${secondId}`)
      .set("x-user-id", "u1")
      .send({ isDefault: true });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ id: secondId, isDefault: true });

    const accounts = await prisma.groupAccount.findMany({
      where: { groupId: "g1" },
    });
    const firstUpdated = accounts.find((a) => a.id === first.body.account.id);
    const secondUpdated = accounts.find((a) => a.id === secondId);
    expect(firstUpdated.isDefault).toBe(false);
    expect(secondUpdated.isDefault).toBe(true);
  });

  it("deletes accounts and reassigns default", async () => {
    const first = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "bank",
        bank: "Access Bank",
        accountNumber: "1234567890",
        accountName: "First",
      });
    const second = await request(app)
      .post("/groups/g1/accounts")
      .set("x-user-id", "u1")
      .send({
        type: "mobile_money",
        provider: "Opay",
        phoneNumber: "+2348012345678",
      });

    const firstId = first.body.account.id;
    const delRes = await request(app)
      .delete(`/groups/g1/accounts/${firstId}`)
      .set("x-user-id", "u1");
    expect(delRes.status).toBe(200);
    expect(delRes.body).toEqual({ message: "Deleted" });

    const remaining = await prisma.groupAccount.findMany({
      where: { groupId: "g1" },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.body.account.id);
    expect(remaining[0].isDefault).toBe(true);
  });
});
