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

    await prisma.user.create({
      data: { id: 'creator', email: 'creator@example.com', name: 'Creator' }
    })

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
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
    const groupId = createRes.body.group.id

    await prisma.user.create({
      data: { id: 'user1', email: 'user1@example.com', name: 'User 1' }
    })

    const joinRes = await request(app)
      .post(`/groups/${groupId}/join`)
      .set('x-user-id', 'user1')
      .send()
    expect(joinRes.status).toBe(200)
    expect(joinRes.body.group).toMatchObject({
      id: groupId,
      name: 'Test',
      description: '',
      memberCount: 2,
      totalSpent: 0,
      recentActivity: '',
      isAdmin: false,
      lastActive: null,
      pendingBills: 0,
      color: 'bg-blue-500'
    })
    expect(joinRes.body.group.members).toEqual(
      expect.arrayContaining(['C', 'U1'])
    )

    const leaveRes = await request(app)
      .post(`/groups/${groupId}/leave`)
      .set('x-user-id', 'creator')
      .send()
    expect(leaveRes.status).toBe(200)
    expect(leaveRes.body).toEqual({ success: true })

    const members = await prisma.groupMember.findMany({ where: { groupId } })
    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({ userId: 'user1', role: 'ADMIN' })
  })

  it('requires authentication to join and leave a group', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

  it('creates a group with attributes and members', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        { id: 'u2', email: 'u2@example.com', name: 'User 2' }
      ]
    })

    const res = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({
        name: 'My Group',
        description: 'Group description',
        color: 'red',
        memberIds: ['u1', 'u2']
      })

    expect(res.status).toBe(201)
    expect(res.body.group).toMatchObject({
      name: 'My Group',
      description: 'Group description',
      color: 'bg-red-500',
      memberCount: 3
    })
    expect(res.body.group.members).toEqual(
      expect.arrayContaining(['U1', 'U2', 'C'])
    )
  })

  it('returns member previews without ids', async () => {
    const res = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Check' })

    expect(res.status).toBe(201)
    const members = res.body.group.members
    expect(Array.isArray(members)).toBe(true)
    expect(typeof members[0]).toBe('string')
  })

  it('rejects empty memberIds array', async () => {
    const res = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test', memberIds: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('memberIds must be a non-empty array')
  })

  it('rejects memberIds that do not exist', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@example.com', name: 'U1' }
    })

    const res = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test', memberIds: ['u1', 'u2'] })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe(
      'All memberIds must correspond to existing users'
    )
  })

  it('lists groups with member ids and color', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

    const res = await request(app).get('/groups').set('x-user-id', 'user1')

    expect(res.status).toBe(200)
    expect(res.body.groups).toHaveLength(1)
    const group = res.body.groups[0]
    expect(group).toMatchObject({
      id: groupId,
      name: 'Test',
      color: 'bg-blue-500'
    })
    expect(group.members).toHaveLength(3)
    expect(group.members).toEqual(
      expect.arrayContaining(['creator', 'user1', 'user2'])
    )
  })

  it('paginates group list', async () => {
    await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'G1' })
    await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'G2' })

    const res1 = await request(app)
      .get('/groups?pageSize=1')
      .set('x-user-id', 'creator')

    expect(res1.status).toBe(200)
    expect(res1.body.groups).toHaveLength(1)
    expect(res1.body.nextPage).toBe(2)

    const res2 = await request(app)
      .get('/groups?page=2&pageSize=1')
      .set('x-user-id', 'creator')

    expect(res2.status).toBe(200)
    expect(res2.body.groups).toHaveLength(1)
    expect(res2.body.nextPage).toBe(null)
  })

  it('fetches group details with members and transactions', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

    const res = await request(app)
      .get(`/groups/${groupId}`)
      .set('x-user-id', 'creator')

    expect(res.status).toBe(200)
    const group = res.body.group
    expect(group).toMatchObject({
      id: groupId,
      totalMembers: 3,
      totalSpent: 10,
      hasMoreTransactions: false,
    })
    expect(group.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'creator',
          email: 'creator@example.com',
          isAdmin: true,
          avatar: 'C',
          balance: 0,
          totalSpent: 0,
          joinedDate: expect.any(String),
        }),
        expect.objectContaining({
          id: 'user1',
          email: 'user1@example.com',
          isAdmin: false,
          avatar: 'U1',
          balance: -10,
          totalSpent: 10,
          joinedDate: expect.any(String),
        }),
        expect.objectContaining({
          id: 'user2',
          email: 'user2@example.com',
          isAdmin: false,
          avatar: 'U2',
          balance: 10,
          totalSpent: 0,
          joinedDate: expect.any(String),
        }),
      ])
    )
    expect(group.recentTransactions).toEqual([
      expect.objectContaining({
        amount: 10,
        type: 'sent',
        paidBy: 'User 1',
        participants: ['User 1', 'User 2'],
        status: 'completed',
      }),
    ])
  })

  it('lists and removes group members', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

    const listRes = await request(app)
      .get(`/groups/${groupId}/members`)
      .set('x-user-id', 'u1')
    expect(listRes.status).toBe(200)
    expect(listRes.body.members).toHaveLength(3)

    const delRes = await request(app)
      .delete(`/groups/${groupId}/members/u2`)
      .set('x-user-id', 'u1')
    expect(delRes.status).toBe(200)

    const listRes2 = await request(app)
      .get(`/groups/${groupId}/members`)
      .set('x-user-id', 'u1')
    expect(listRes2.body.members).toHaveLength(2)
  })

  it('handles invites and invite links', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

    const invitesRes = await request(app)
      .get(`/groups/${groupId}/invites`)
      .set('x-user-id', 'u1')
    expect(invitesRes.status).toBe(200)
    expect(invitesRes.body.invites).toHaveLength(1)

    const resendRes = await request(app)
      .post(`/groups/${groupId}/invites/${invite.id}/resend`)
      .set('x-user-id', 'u1')
    expect(resendRes.status).toBe(200)
    expect(resendRes.body.invite.attempts).toBe(2)

    const deleteRes = await request(app)
      .delete(`/groups/${groupId}/invites/${invite.id}`)
      .set('x-user-id', 'u1')
    expect(deleteRes.status).toBe(200)

    const linkRes = await request(app)
      .post(`/groups/${groupId}/invite-links`)
      .set('x-user-id', 'u1')
      .send({ maxUses: 5, expireDays: 1 })
    expect(linkRes.status).toBe(201)

    const getLinks = await request(app)
      .get(`/groups/${groupId}/invite-links`)
      .set('x-user-id', 'u1')
    expect(getLinks.status).toBe(200)
    expect(getLinks.body.links).toHaveLength(1)
  })

  it('fetches group transactions and splits bill', async () => {
    const createRes = await request(app)
      .post('/groups')
      .set('x-user-id', 'creator')
      .send({ name: 'Test' })
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

    const txRes = await request(app)
      .get(`/groups/${groupId}/transactions`)
      .set('x-user-id', 'creator')
    expect(txRes.status).toBe(200)
    expect(txRes.body.transactions).toHaveLength(1)

    const splitRes = await request(app)
      .post(`/groups/${groupId}/split-bill`)
      .send({ amount: 20, participants: ['u1', 'u2'] })
    expect(splitRes.status).toBe(201)
    expect(splitRes.body.transactions).toBeTruthy()
    expect(splitRes.body.transactions).toHaveLength(2)
    expect(splitRes.body.balances.u1).toBe(-20)
    expect(splitRes.body.balances.u2).toBe(20)
  })
})
