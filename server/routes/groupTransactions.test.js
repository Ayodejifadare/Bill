/**
 * @vitest-environment node
 */
import express from "express";
import request from "supertest";
import groupRouter from "./groups.js";
import { PrismaClient } from "@prisma/client";
import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// This test focuses on the group split bill endpoint

describe("Group split bill route", () => {
  let app;
  let prisma;
  const dbPath = path.join(
    __dirname,
    "..",
    "prisma",
    "group-split-bill-test.db",
  );

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`;
    execSync("npx prisma migrate deploy", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.billSplitParticipant.deleteMany();
    await prisma.billSplit.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.createMany({
      data: [
        { id: "creator", email: "creator@example.com", name: "Creator" },
        { id: "u2", email: "u2@example.com", name: "User 2" },
      ],
    });

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.prisma = prisma;
      next();
    });
    app.use("/groups", groupRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("creates a bill split transaction and updates group stats", async () => {
    // create group with creator
    const createRes = await request(app)
      .post("/groups")
      .set("x-user-id", "creator")
      .send({ name: "Trip" });
    const groupId = createRes.body.group.id;

    // add second user to group
    await prisma.groupMember.create({ data: { groupId, userId: "u2" } });

    // split bill: creator pays for u2
    const splitRes = await request(app)
      .post(`/groups/${groupId}/split-bill`)
      .set("x-user-id", "creator")
      .send({ amount: 60, description: "Dinner", participants: ["u2"] });

    expect(splitRes.status).toBe(201);
    expect(splitRes.body.transaction).toMatchObject({
      type: "bill_split",
      amount: 30,
      description: "Dinner",
      paidBy: "Creator",
      participants: ["Creator", "User 2"],
    });

    // verify user2 can view the group
    const listRes = await request(app).get("/groups").set("x-user-id", "u2");
    expect(listRes.status).toBe(200);
  });

  it("defaults participants to all group members when omitted", async () => {
    const createRes = await request(app)
      .post("/groups")
      .set("x-user-id", "creator")
      .send({ name: "Trip" });
    const groupId = createRes.body.group.id;

    await prisma.groupMember.create({ data: { groupId, userId: "u2" } });

    const res = await request(app)
      .post(`/groups/${groupId}/split-bill`)
      .set("x-user-id", "creator")
      .send({ amount: 60, description: "Dinner" });

    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      type: "bill_split",
      amount: 30,
      participants: ["Creator", "User 2"],
    });
  });

  it("returns 400 when body is empty", async () => {
    const createRes = await request(app)
      .post("/groups")
      .set("x-user-id", "creator")
      .send({ name: "Trip" });
    const groupId = createRes.body.group.id;

    const res = await request(app)
      .post(`/groups/${groupId}/split-bill`)
      .set("x-user-id", "creator")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Amount is required and must be a positive number",
    });
  });
});
