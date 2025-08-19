/**
 * @vitest-environment node
 */
import express from 'express'
import request from 'supertest'
import groupRouter from './groups.js'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Group join/leave routes', () => {
  let app
  let prisma
  const dbPath = path.join(__dirname, '..', 'prisma', 'test.db')

  beforeAll(() => {
    process.env.DATABASE_URL = `file:${dbPath}`
    execSync('npx prisma migrate deploy', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
    prisma = new PrismaClient()
  })

  beforeEach(async () => {
    await prisma.transaction.deleteMany()
    await prisma.groupInviteLink.deleteMany()
    await prisma.groupInvite.deleteMany()
    await prisma.groupAccount.deleteMany()
    await prisma.groupMember.deleteMany()
    await prisma.group.deleteMany()
    await prisma.user.deleteMany()

    app = express()
    app.use(express.json())
    app.use((req, res, next) => {
      req.prisma = prisma
      next()
    })
    app.use('/groups', groupRouter)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('joins and leaves a group', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

    await prisma.user.create({
      data: { id: 'user1', email: 'user1@example.com', name: 'User 1' }
    })

    const joinRes = await request(app)
      .post(`/groups/${groupId}/join`)
      .set('x-user-id', 'user1')
      .send()
    expect(joinRes.status).toBe(200)
    expect(joinRes.body.group.members).toContain('user1')

    const leaveRes = await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('x-user-id', 'user1')
      .send()
    expect(leaveRes.status).toBe(200)
    expect(leaveRes.body.group.members).not.toContain('user1')
  })

  it('requires authentication to join and leave a group', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

    const joinRes = await request(app)
      .post(`/groups/${groupId}/join`)
      .send()
    expect(joinRes.status).toBe(401)

    const leaveRes = await request(app)
      .post(`/groups/${groupId}/leave`)
      .send()
    expect(leaveRes.status).toBe(401)
  })

  it('lists groups with member details and aggregates', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

    await prisma.user.createMany({
      data: [
        { id: 'user1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user2', email: 'user2@example.com', name: 'User 2' }
      ]
    })

    await prisma.groupMember.createMany({
      data: [
        { groupId, userId: 'user1' },
        { groupId, userId: 'user2' }
      ]
    })

    await prisma.transaction.createMany({
      data: [
        { senderId: 'user1', receiverId: 'user2', amount: 10, type: 'SEND', status: 'COMPLETED' },
        { senderId: 'user2', receiverId: 'user1', amount: 5, type: 'SEND', status: 'COMPLETED' }
      ]
    })

    const res = await request(app).get('/groups')

    expect(res.status).toBe(200)
    expect(res.body.groups).toHaveLength(1)
    const group = res.body.groups[0]
    expect(group).toMatchObject({
      id: groupId,
      name: 'Test',
      memberCount: 2,
      totalSpent: 15
    })
    expect(group.members).toHaveLength(2)
    expect(group.members).toEqual(
      expect.arrayContaining([
        { name: 'User 1', avatar: '' },
        { name: 'User 2', avatar: '' }
      ])
    )
    expect(group).toHaveProperty('description')
    expect(group).toHaveProperty('recentActivity')
    expect(group).toHaveProperty('isAdmin')
    expect(group).toHaveProperty('lastActive')
    expect(group).toHaveProperty('pendingBills')
    expect(group).toHaveProperty('color')
  })

  it('fetches group details with members and transactions', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id

    await prisma.user.createMany({
      data: [
        { id: 'user1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user2', email: 'user2@example.com', name: 'User 2' }
      ]
    })

    await prisma.groupMember.createMany({
      data: [
        { groupId, userId: 'user1' },
        { groupId, userId: 'user2' }
      ]
    })

    await prisma.transaction.create({
      data: {
        senderId: 'user1',
        receiverId: 'user2',
        amount: 10,
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    const res = await request(app).get(`/groups/${groupId}`)

    expect(res.status).toBe(200)
    expect(res.body.group.id).toBe(groupId)
    expect(res.body.group.members).toHaveLength(2)
    expect(res.body.group.recentTransactions).toHaveLength(1)
  })

  it('lists and removes group members', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'U1' },
        { id: 'u2', email: 'u2@example.com', name: 'U2' }
      ]
    })
    await prisma.groupMember.createMany({
      data: [
        { groupId, userId: 'u1', role: 'ADMIN' },
        { groupId, userId: 'u2' }
      ]
    })

    const listRes = await request(app).get(`/groups/${groupId}/members`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.members).toHaveLength(2)

    const delRes = await request(app).delete(`/groups/${groupId}/members/u2`)
    expect(delRes.status).toBe(200)

    const listRes2 = await request(app).get(`/groups/${groupId}/members`)
    expect(listRes2.body.members).toHaveLength(1)
  })

  it('handles invites and invite links', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id
    // create initial invite
    const invite = await prisma.groupInvite.create({
      data: {
        groupId,
        contact: 'alice@example.com',
        method: 'email',
        invitedBy: 'u1',
        expiresAt: new Date(Date.now() + 86400000)
      }
    })

    const invitesRes = await request(app).get(`/groups/${groupId}/invites`)
    expect(invitesRes.status).toBe(200)
    expect(invitesRes.body.invites).toHaveLength(1)

    const resendRes = await request(app)
      .post(`/groups/${groupId}/invites/${invite.id}/resend`)
    expect(resendRes.status).toBe(200)
    expect(resendRes.body.invite.attempts).toBe(2)

    const deleteRes = await request(app)
      .delete(`/groups/${groupId}/invites/${invite.id}`)
    expect(deleteRes.status).toBe(200)

    const linkRes = await request(app)
      .post(`/groups/${groupId}/invite-links`)
      .send({ maxUses: 5, expireDays: 1 })
    expect(linkRes.status).toBe(201)

    const getLinks = await request(app).get(`/groups/${groupId}/invite-links`)
    expect(getLinks.status).toBe(200)
    expect(getLinks.body.links).toHaveLength(1)
  })

  it('fetches group transactions and splits bill', async () => {
    const createRes = await request(app).post('/groups').send({ name: 'Test' })
    const groupId = createRes.body.group.id
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'U1' },
        { id: 'u2', email: 'u2@example.com', name: 'U2' }
      ]
    })
    await prisma.groupMember.createMany({
      data: [
        { groupId, userId: 'u1' },
        { groupId, userId: 'u2' }
      ]
    })
    await prisma.transaction.create({
      data: {
        senderId: 'u1',
        receiverId: 'u2',
        amount: 10,
        type: 'SEND',
        status: 'COMPLETED'
      }
    })

    const txRes = await request(app).get(`/groups/${groupId}/transactions`)
    expect(txRes.status).toBe(200)
    expect(txRes.body.transactions).toHaveLength(1)

    const splitRes = await request(app).post(`/groups/${groupId}/split-bill`)
    expect(splitRes.status).toBe(201)
    expect(splitRes.body.transaction).toBeTruthy()
  })
})
